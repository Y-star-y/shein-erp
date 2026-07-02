import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import { internalProductAccessDeniedResponse } from "@/lib/internal-product-access";
import { deleteAccessibleProductMapping } from "@/lib/internal-product-mappings";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; mappingId: string }> },
) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "productManagement");
  if (denied) return denied;

  const { id, mappingId } = await params;
  const result = await deleteAccessibleProductMapping(authResult.session, id, mappingId);
  if ("error" in result) {
    return internalProductAccessDeniedResponse(
      result.error,
      result.error === "内部商品不存在" || result.error === "映射不存在或无权访问",
    );
  }

  return NextResponse.json(result);
}
