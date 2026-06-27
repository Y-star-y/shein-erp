import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const RESET_TOKEN_TTL_HOURS = 1;

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createResetTokenRaw() {
  return randomBytes(32).toString("hex");
}

export async function createPasswordResetToken(userId: string) {
  await prisma.passwordResetToken.deleteMany({ where: { userId } });

  const rawToken = createResetTokenRaw();
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return rawToken;
}

export async function findValidResetToken(rawToken: string) {
  const tokenHash = hashResetToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.expiresAt < new Date()) {
    return null;
  }

  return record;
}

export async function consumeResetToken(rawToken: string) {
  const record = await findValidResetToken(rawToken);
  if (!record) return null;

  await prisma.passwordResetToken.delete({ where: { id: record.id } });
  return record.user;
}

/** AUTH_URL 优先，便于内网固定 IP；未配置时回退到请求 origin */
export function resolveAppOrigin(request: Request): string {
  const configured = process.env.AUTH_URL?.replace(/\/$/, "");
  if (configured) return configured;
  return new URL(request.url).origin;
}

export function buildResetLink(origin: string, rawToken: string) {
  return `${origin}/reset-password?token=${encodeURIComponent(rawToken)}`;
}

export function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST?.trim());
}

function logResetLinkToTerminal(email: string, resetLink: string) {
  const line = "─".repeat(44);
  console.info(`[password-reset] ${line}`);
  console.info(`[password-reset]   邮箱: ${email}`);
  console.info(`[password-reset]   重置链接（${RESET_TOKEN_TTL_HOURS} 小时内有效）:`);
  console.info(`[password-reset]   ${resetLink}`);
  console.info(`[password-reset] ${line}`);
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  if (!isSmtpConfigured()) {
    logResetLinkToTerminal(email, resetLink);
    return { sent: false, devLink: resetLink };
  }

  // SMTP integration placeholder — log link until mailer is configured
  console.info(`[password-reset] Would email ${email}: ${resetLink}`);
  return { sent: true };
}
