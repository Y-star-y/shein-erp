import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";

const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const CAPTCHA_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function hashCaptchaCode(code: string) {
  return createHash("sha256").update(code.toUpperCase()).digest("hex");
}

function generateCaptchaCode(length = 4) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CAPTCHA_CHARS[randomInt(CAPTCHA_CHARS.length)];
  }
  return code;
}

function buildCaptchaSvg(code: string) {
  const width = 120;
  const height = 40;
  const lines = Array.from({ length: 4 }, () => {
    const x1 = randomInt(width);
    const y1 = randomInt(height);
    const x2 = randomInt(width);
    const y2 = randomInt(height);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ccc" stroke-width="1"/>`;
  }).join("");

  const chars = code
    .split("")
    .map((char, index) => {
      const x = 18 + index * 24 + randomInt(-3, 4);
      const y = 26 + randomInt(-4, 5);
      const rotate = randomInt(-25, 26);
      return `<text x="${x}" y="${y}" fill="#333" font-size="22" font-family="monospace" transform="rotate(${rotate} ${x} ${y})">${char}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f5f5f5"/>${lines}${chars}</svg>`;
}

export async function createLoginCaptcha() {
  const code = generateCaptchaCode();
  const expiresAt = new Date(Date.now() + CAPTCHA_TTL_MS);

  const record = await prisma.loginCaptcha.create({
    data: {
      codeHash: hashCaptchaCode(code),
      expiresAt,
    },
  });

  return {
    captchaId: record.id,
    svg: buildCaptchaSvg(code),
  };
}

export async function verifyLoginCaptcha(captchaId: string, code: string) {
  const normalized = code.trim();
  if (!captchaId || !normalized) return false;

  const record = await prisma.loginCaptcha.findUnique({ where: { id: captchaId } });
  if (!record || record.expiresAt < new Date()) {
    if (record) {
      await prisma.loginCaptcha.delete({ where: { id: record.id } }).catch(() => undefined);
    }
    return false;
  }

  const valid = record.codeHash === hashCaptchaCode(normalized);
  await prisma.loginCaptcha.delete({ where: { id: record.id } }).catch(() => undefined);
  return valid;
}

export async function purgeExpiredCaptchas() {
  await prisma.loginCaptcha.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
