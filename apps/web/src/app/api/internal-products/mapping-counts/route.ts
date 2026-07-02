import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import { findInternalProductsForSession } from "@/lib/internal-product-access";
import { getAccessibleMappingCounts } from "@/lib/internal-product-mappings";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "productManagement");
  if (denied) return denied;

  const products = await findInternalProductsForSession(authResult.session);
  const counts = await getAccessibleMappingCounts(
    authResult.session,
    products.map((product) => product.id),
  );

  return NextResponse.json({ counts });
}
