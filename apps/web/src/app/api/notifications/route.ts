import { getSessionOr401 } from "@/lib/auth-helpers";
import { buildNotificationsSummary } from "@/lib/pending-tasks";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const summary = await buildNotificationsSummary(authResult.session);
  return NextResponse.json(summary);
}
