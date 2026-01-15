// auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { CredentialsSignin } from "@auth/core/errors";

import { prisma } from "@/lib/prisma";

type Creds = Partial<Record<"email" | "password", unknown>>;

// ✅ Custom errors so you can show specific messages in UI
class EmailNotFoundError extends CredentialsSignin {
  code = "EmailNotFound";
}
class InvalidCredentialsError extends CredentialsSignin {
  code = "InvalidCredentials";
}
class EmailNotVerifiedError extends CredentialsSignin {
  code = "EmailNotVerified";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
  },

  providers: [
    // GitHub (optional)
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GitHub({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
          }),
        ]
      : []),

    // Google (optional)
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
          }),
        ]
      : []),

    // Credentials
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

        // ✅ Require verified email for credentials login
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
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      if (user && "role" in user) (token as any).role = (user as any).role;

      // OAuth users: load role once
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
      if (session.user && (token as any).role) (session.user as any).role = (token as any).role;
      return session;
    },
  },
});
