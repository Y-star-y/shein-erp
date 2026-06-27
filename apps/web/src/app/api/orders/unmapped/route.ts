import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import { fetchUnmappedOrderLines } from "@/lib/pending-tasks";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "orderManagement");
  if (denied) return denied;

  return NextResponse.json(await fetchUnmappedOrderLines(authResult.session));
}
