import { NextResponse } from "next/server";
import { createLoginCaptcha, purgeExpiredCaptchas } from "@/lib/login-captcha";

export async function GET() {
  await purgeExpiredCaptchas().catch(() => undefined);
  const captcha = await createLoginCaptcha();
  return NextResponse.json(captcha);
}
