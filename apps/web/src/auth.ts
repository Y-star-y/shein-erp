import { authConfig } from "@/auth.config";
import { writeAuditLog } from "@/lib/audit-log";
import { authorizeCredentials, buildAuthUserFromEmail } from "@/lib/auth-login";
import { WeComProvider } from "@/lib/wecom-provider";
import type { AppModule, Role } from "@prisma/client";
import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      captchaId: { label: "Captcha ID", type: "text" },
      captchaCode: { label: "Captcha Code", type: "text" },
      loginBypass: { label: "Login Bypass", type: "text" },
    },
    authorize: async (credentials) => {
      const email = credentials?.email?.toString().trim().toLowerCase();
      const password = credentials?.password?.toString();

      if (!email || !password) {
        return null;
      }

      const result = await authorizeCredentials(email, password, {
        captchaId: credentials?.captchaId?.toString(),
        captchaCode: credentials?.captchaCode?.toString(),
        loginBypass: credentials?.loginBypass?.toString(),
        hasCookie: false,
      });

      if (!result.ok) {
        return null;
      }

      return result.user;
    },
  }),
];

if (process.env.WEWORK_CORP_ID && process.env.WEWORK_AGENT_ID && process.env.WEWORK_SECRET) {
  providers.push(WeComProvider());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "wecom") {
        const email = user.email?.toLowerCase();
        if (!email) return false;

        const payload = await buildAuthUserFromEmail(email);
        if (!payload) {
          await writeAuditLog({
            userId: null,
            action: "企业微信登录失败",
            entity: "User",
            entityId: email,
            detail: { email, reason: "未找到匹配员工账户" },
          });
          return false;
        }

        Object.assign(user, payload);
        await writeAuditLog({
          userId: payload.id,
          action: "企业微信登录成功",
          entity: "User",
          entityId: payload.id,
          detail: { email },
        });
      }
      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role as Role;
        token.permissions = user.permissions as AppModule[];
        token.idNumberRevealed = false;
        token.mustChangePassword = user.mustChangePassword ?? false;
        token.sessionVersion = (user as { sessionVersion?: number }).sessionVersion ?? 0;
        token.companyId = (user as { companyId?: string | null }).companyId ?? null;
        token.companyName = (user as { companyName?: string | null }).companyName ?? null;
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
        session.user.companyId = (token.companyId as string | null | undefined) ?? null;
        session.user.companyName = (token.companyName as string | null | undefined) ?? null;
        if (token.email) {
          session.user.email = token.email as string;
        }
      }
      return session;
    },
  },
});
