import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getLoginStatusForEmail, LOGIN_CAPTCHA_COOKIE } from "@/lib/auth-login";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const cookieStore = await cookies();
  const hasCookie = cookieStore.get(LOGIN_CAPTCHA_COOKIE)?.value === "1";

  const status = await getLoginStatusForEmail(email, hasCookie);
  return NextResponse.json(status);
}
