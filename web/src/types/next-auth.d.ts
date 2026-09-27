import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "user" | "admin";
      sessionId?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "user" | "admin";
    sessionId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "user" | "admin";
    sessionId?: string;
  }
}
