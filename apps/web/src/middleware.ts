import { authConfig } from "@/auth.config";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
];

const CHANGE_PASSWORD_PATH = "/change-password-required";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const isPublicPath =
    PUBLIC_PATHS.some((p) => pathname === p) || pathname.startsWith("/api/auth");

  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && pathname === "/login") {
    const dest = req.auth?.user?.mustChangePassword ? CHANGE_PASSWORD_PATH : "/";
    return NextResponse.redirect(new URL(dest, req.nextUrl.origin));
  }

  const mustChange = req.auth?.user?.mustChangePassword;
  if (isLoggedIn && mustChange) {
    const allowed =
      pathname === CHANGE_PASSWORD_PATH || pathname.startsWith("/api/auth/");

    if (!allowed) {
      return NextResponse.redirect(new URL(CHANGE_PASSWORD_PATH, req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
