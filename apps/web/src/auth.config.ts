import type { AppModule, Role } from "@prisma/client";
import type { NextAuthConfig } from "next-auth";

const SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours

export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE, updateAge: 60 * 60 },
  providers: [],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.permissions = user.permissions;
        token.idNumberRevealed = false;
        token.mustChangePassword = user.mustChangePassword ?? false;
        token.sessionVersion = user.sessionVersion ?? 0;
      }
      if (trigger === "update" && session) {
        if (typeof session.idNumberRevealed === "boolean") {
          token.idNumberRevealed = session.idNumberRevealed;
        }
        if (typeof session.email === "string" && session.email) {
          token.email = session.email;
        }
        if (typeof session.mustChangePassword === "boolean") {
          token.mustChangePassword = session.mustChangePassword;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.permissions = (token.permissions ?? []) as AppModule[];
        session.user.idNumberRevealed = Boolean(token.idNumberRevealed);
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
        session.user.sessionVersion = Number(token.sessionVersion ?? 0);
        if (token.email) {
          session.user.email = token.email as string;
        }
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
