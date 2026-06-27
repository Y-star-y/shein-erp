import { signIn } from "@/auth";
import {
  authorizeCredentials,
  LOGIN_CAPTCHA_COOKIE,
  signLoginBypass,
} from "@/lib/auth-login";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function setCaptchaCookie(response: NextResponse) {
  response.cookies.set(LOGIN_CAPTCHA_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 3600,
    path: "/",
  });
}

function clearCaptchaCookie(response: NextResponse) {
  response.cookies.set(LOGIN_CAPTCHA_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    captchaId?: string;
    captchaCode?: string;
  };

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password?.toString() ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "请输入邮箱和密码", code: "INVALID_CREDENTIALS" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const hasCookie = cookieStore.get(LOGIN_CAPTCHA_COOKIE)?.value === "1";

  const result = await authorizeCredentials(email, password, {
    captchaId: body.captchaId,
    captchaCode: body.captchaCode,
    hasCookie,
  });

  if (!result.ok) {
    const response = NextResponse.json(
      {
        error: result.message,
        code: result.code,
        requiresCaptcha: result.requiresCaptcha ?? true,
        lockedUntil: result.lockedUntil?.toISOString() ?? null,
      },
      { status: result.code === "LOCKED" ? 423 : 401 },
    );
    setCaptchaCookie(response);
    return response;
  }

  const bypass = signLoginBypass(email);
  try {
    await signIn("credentials", {
      email,
      password,
      loginBypass: bypass,
      redirect: false,
    });
  } catch (error) {
    console.error("[POST /api/auth/login] signIn failed", error);
    const response = NextResponse.json({ error: "登录失败，请稍后重试", code: "INVALID_CREDENTIALS" }, { status: 500 });
    setCaptchaCookie(response);
    return response;
  }

  const response = NextResponse.json({ ok: true });
  clearCaptchaCookie(response);
  return response;
}
