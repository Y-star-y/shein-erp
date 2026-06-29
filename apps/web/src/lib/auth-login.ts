import { writeAuditLog } from "@/lib/audit-log";
import { verifyLoginCaptcha } from "@/lib/login-captcha";
import { resolveUserPermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "crypto";
import type { User } from "@prisma/client";

function toAuthUserPayload(user: User & { company?: { id: string; name: string } | null }): AuthUserPayload {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: resolveUserPermissions(user.role, user.permissions ?? []),
    mustChangePassword: user.mustChangePassword,
    sessionVersion: user.sessionVersion,
    companyId: user.companyId ?? user.company?.id ?? null,
    companyName: user.company?.name ?? null,
  };
}

export const LOGIN_CAPTCHA_COOKIE = "login_captcha_required";
export const MAX_FAILURES_PER_HOUR = 3;
export const CAPTCHA_THRESHOLD = 1;
const FAILURE_WINDOW_MS = 60 * 60 * 1000;
const LOGIN_BYPASS_TTL_MS = 60 * 1000;

export type AuthUserPayload = {
  id: string;
  name: string;
  email: string;
  role: import("@prisma/client").Role;
  permissions: import("@prisma/client").AppModule[];
  mustChangePassword: boolean;
  sessionVersion: number;
  companyId: string | null;
  companyName: string | null;
};

export type LoginErrorCode =
  | "LOCKED"
  | "CAPTCHA_REQUIRED"
  | "CAPTCHA_INVALID"
  | "INVALID_CREDENTIALS"
  | "NO_PASSWORD";

export type AuthorizeResult =
  | { ok: true; user: AuthUserPayload }
  | { ok: false; code: LoginErrorCode; message: string; requiresCaptcha?: boolean; lockedUntil?: Date };

export function isLoginLocked(user: Pick<User, "lockedUntil">) {
  return Boolean(user.lockedUntil && user.lockedUntil > new Date());
}

export function requiresCaptcha(user: Pick<User, "failedLoginAttempts"> | null, hasCookie: boolean) {
  if (hasCookie) return true;
  if (!user) return hasCookie;
  return user.failedLoginAttempts >= CAPTCHA_THRESHOLD;
}

export function signLoginBypass(email: string) {
  const exp = Date.now() + LOGIN_BYPASS_TTL_MS;
  const sig = createHmac("sha256", process.env.AUTH_SECRET ?? "dev-secret")
    .update(`${email.toLowerCase()}:${exp}`)
    .digest("hex");
  return `${exp}.${sig}`;
}

export function verifyLoginBypass(email: string, token: string | undefined) {
  if (!token) return false;
  const [expRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  if (!exp || !sig || exp < Date.now()) return false;

  const expected = createHmac("sha256", process.env.AUTH_SECRET ?? "dev-secret")
    .update(`${email.toLowerCase()}:${exp}`)
    .digest("hex");

  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function clearLoginLock(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      loginFailureWindowStart: null,
      lockedUntil: null,
    },
  });
}

async function recordPasswordFailure(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const now = new Date();
  let windowStart = user.loginFailureWindowStart;
  let attempts = user.failedLoginAttempts;

  if (!windowStart || now.getTime() - windowStart.getTime() >= FAILURE_WINDOW_MS) {
    windowStart = now;
    attempts = 1;
  } else {
    attempts += 1;
  }

  const lockedUntil =
    attempts >= MAX_FAILURES_PER_HOUR
      ? new Date(windowStart.getTime() + FAILURE_WINDOW_MS)
      : null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: attempts,
      loginFailureWindowStart: windowStart,
      lockedUntil,
    },
  });

  return { attempts, lockedUntil, windowStart };
}

function formatLockMessage(lockedUntil: Date) {
  const time = lockedUntil.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  return `账户已锁定，请于 ${time} 后再试或联系管理员`;
}

export async function authorizeCredentials(
  email: string,
  password: string,
  options?: {
    captchaId?: string;
    captchaCode?: string;
    hasCookie?: boolean;
    loginBypass?: string;
  },
): Promise<AuthorizeResult> {
  const hasCookie = options?.hasCookie ?? false;
  const bypass = verifyLoginBypass(email, options?.loginBypass);
  let user = await prisma.user.findUnique({
    where: { email },
    include: { company: { select: { id: true, name: true } } },
  });

  if (user?.loginFailureWindowStart && !isLoginLocked(user)) {
    const windowExpired = Date.now() - user.loginFailureWindowStart.getTime() >= FAILURE_WINDOW_MS;
    if (windowExpired && (user.failedLoginAttempts > 0 || user.lockedUntil)) {
      await clearLoginLock(user.id);
      user = await prisma.user.findUnique({
        where: { email },
        include: { company: { select: { id: true, name: true } } },
      });
    }
  }

  if (!user || user.active === false) {
    await writeAuditLog({
      userId: user?.id ?? null,
      action: "登录失败",
      entity: "User",
      entityId: user?.id ?? email,
      detail: { email, reason: "账户不存在或已禁用" },
    });
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: "邮箱或密码错误",
      requiresCaptcha: true,
    };
  }

  if (isLoginLocked(user)) {
    await writeAuditLog({
      userId: user.id,
      action: "登录失败",
      entity: "User",
      entityId: user.id,
      detail: { email, reason: "账户已锁定", lockedUntil: user.lockedUntil?.toISOString() },
    });
    return {
      ok: false,
      code: "LOCKED",
      message: formatLockMessage(user.lockedUntil!),
      lockedUntil: user.lockedUntil!,
      requiresCaptcha: true,
    };
  }

  if (!user.passwordHash) {
    await writeAuditLog({
      userId: user.id,
      action: "登录失败",
      entity: "User",
      entityId: user.id,
      detail: { email, reason: "未设置密码" },
    });
    return { ok: false, code: "NO_PASSWORD", message: "该账户未设置密码，请联系管理员" };
  }

  const needCaptcha = requiresCaptcha(user, hasCookie);
  if (needCaptcha && !bypass) {
    if (!options?.captchaId || !options?.captchaCode) {
      return {
        ok: false,
        code: "CAPTCHA_REQUIRED",
        message: "请输入验证码",
        requiresCaptcha: true,
      };
    }

    const captchaValid = await verifyLoginCaptcha(options.captchaId, options.captchaCode);
    if (!captchaValid) {
      return {
        ok: false,
        code: "CAPTCHA_INVALID",
        message: "验证码错误或已过期，请刷新后重试",
        requiresCaptcha: true,
      };
    }
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const failure = await recordPasswordFailure(user.id);

    await writeAuditLog({
      userId: user.id,
      action: "登录失败",
      entity: "User",
      entityId: user.id,
      detail: {
        email,
        reason: failure?.lockedUntil ? "密码错误，账户已锁定" : "密码错误",
        attempts: failure?.attempts,
        lockedUntil: failure?.lockedUntil?.toISOString() ?? null,
      },
    });

    if (failure?.lockedUntil) {
      return {
        ok: false,
        code: "LOCKED",
        message: formatLockMessage(failure.lockedUntil),
        lockedUntil: failure.lockedUntil,
        requiresCaptcha: true,
      };
    }

    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: "邮箱或密码错误",
      requiresCaptcha: true,
    };
  }

  await clearLoginLock(user.id);

  await writeAuditLog({
    userId: user.id,
    action: "登录成功",
    entity: "User",
    entityId: user.id,
    detail: { email },
  });

  return {
    ok: true,
    user: toAuthUserPayload(user),
  };
}

export async function getLoginStatusForEmail(email: string, hasCookie: boolean) {
  const user = email
    ? await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          failedLoginAttempts: true,
          loginFailureWindowStart: true,
          lockedUntil: true,
        },
      })
    : null;

  if (user && isLoginLocked(user)) {
    return {
      requiresCaptcha: true,
      locked: true,
      lockedUntil: user.lockedUntil!.toISOString(),
      failuresInWindow: user.failedLoginAttempts,
    };
  }

  return {
    requiresCaptcha: requiresCaptcha(user, hasCookie),
    locked: false,
    lockedUntil: null as string | null,
    failuresInWindow: user?.failedLoginAttempts ?? 0,
  };
}

export async function buildAuthUserFromEmail(email: string): Promise<AuthUserPayload | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { company: { select: { id: true, name: true } } },
  });
  if (!user || !user.active) return null;

  return toAuthUserPayload(user);
}
