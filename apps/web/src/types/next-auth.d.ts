import type { AppModule, Role } from "@prisma/client";

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      permissions: AppModule[];
      idNumberRevealed: boolean;
      mustChangePassword: boolean;
      sessionVersion: number;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    permissions: AppModule[];
    mustChangePassword?: boolean;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    permissions: AppModule[];
    idNumberRevealed?: boolean;
    mustChangePassword?: boolean;
    sessionVersion?: number;
  }
}

declare module "next-auth/react" {
  interface Session {
    idNumberRevealed?: boolean;
    mustChangePassword?: boolean;
    sessionVersion?: number;
    email?: string;
  }
}
