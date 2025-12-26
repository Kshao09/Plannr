import type { DefaultSession } from "next-auth";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ORGANIZER" | "MEMBER";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "ORGANIZER" | "MEMBER";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ORGANIZER" | "MEMBER";
  }
}
