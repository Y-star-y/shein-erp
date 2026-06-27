import { getSessionOr401 } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;
  return NextResponse.json({ ok: true });
}
