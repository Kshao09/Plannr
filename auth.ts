// auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { CredentialsSignin } from "@auth/core/errors";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { SIGNUP_ROLE_COOKIE, normalizeRole } from "@/lib/authSignUpCookie";

type Creds = Partial<Record<"email" | "password", unknown>>;

class EmailNotFoundError extends CredentialsSignin {
  code = "EmailNotFound";
}
class InvalidCredentialsError extends CredentialsSignin {
  code = "InvalidCredentials";
}
class EmailNotVerifiedError extends CredentialsSignin {
  code = "EmailNotVerified";
}

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
const SESSION_UPDATE_AGE_SECONDS = 60; // 60s

function isOAuth(account: any) {
  return account?.type === "oauth" || account?.type === "oidc";
}

// ✅ Wrap PrismaAdapter to block "implicit signup" for OAuth
function PlannrAdapter() {
  const base = PrismaAdapter(prisma) as any;

  return {
    ...base,

    // Called when Auth.js needs to CREATE a brand-new User row.
    async createUser(data: any) {
      const store = await cookies();
      const desiredRole = normalizeRole(store.get(SIGNUP_ROLE_COOKIE)?.value);

      // If no role cookie exists, we did NOT come from /signup → block
      if (!desiredRole) {
        // This will surface as ?error=Configuration or similar unless you map it.
        // We'll show a friendly message in /login.
        throw new Error("NO_ACCOUNT");
      }

      const user = await prisma.user.create({
        data: {
          ...data,
          role: desiredRole,
        },
      });

      // Optional: clear cookie so it doesn't linger
      store.set({
        name: SIGNUP_ROLE_COOKIE,
        value: "",
        path: "/",
        maxAge: 0,
      });

      return user as any;
    },
  } as any;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PlannrAdapter(),

  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },

  jwt: {
    maxAge: SESSION_MAX_AGE_SECONDS,
  },

  secret: process.env.AUTH_SECRET,

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: [
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GitHub({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
          }),
        ]
      : []),

    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
          }),
        ]
      : []),

    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials: Creds) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";

        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) throw new InvalidCredentialsError();

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            hashedPassword: true,
            emailVerified: true,
          },
        });

        if (!user) throw new EmailNotFoundError();
        if (!user.hashedPassword) throw new InvalidCredentialsError();
        if (!user.emailVerified) throw new EmailNotVerifiedError();

        const ok = await bcrypt.compare(password, user.hashedPassword);
        if (!ok) throw new InvalidCredentialsError();

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ account }) {
      // Existing users are fine. New users are gated by createUser().
      if (isOAuth(account)) return true;
      return true;
    },

    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      if (user && "role" in user) (token as any).role = (user as any).role;

      if (token.sub && !(token as any).role) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true },
        });
        if (dbUser?.role) (token as any).role = dbUser.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.sub) (session.user as any).id = token.sub;
      if (session.user && (token as any).role)
        (session.user as any).role = (token as any).role;
      return session;
    },
  },
});
