import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ORGANIZER" | "MEMBER";
    } & DefaultSession["user"];
  }

  interface User {
    role: "ORGANIZER" | "MEMBER";
  }
}

import type { DefaultSession } from "next-auth";
