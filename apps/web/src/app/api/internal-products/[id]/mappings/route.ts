import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import { internalProductAccessDeniedResponse } from "@/lib/internal-product-access";
import {
  createAccessibleProductMapping,
  getAccessibleMappingsForProduct,
} from "@/lib/internal-product-mappings";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "productManagement");
  if (denied) return denied;

  const { id } = await params;
  const result = await getAccessibleMappingsForProduct(authResult.session, id);
  if ("error" in result) {
    return internalProductAccessDeniedResponse(result.error, result.error === "内部商品不存在");
  }

  return NextResponse.json(result);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "productManagement");
  if (denied) return denied;

  const { id } = await params;
  const body = (await request.json()) as {
    storeId?: string;
    platformSku?: string;
  };

  const result = await createAccessibleProductMapping(authResult.session, id, {
    storeId: body.storeId ?? "",
    platformSku: body.platformSku ?? "",
  });

  if ("error" in result) {
    const notFound =
      result.error === "内部商品不存在" ||
      result.error === "无权访问该内部商品" ||
      result.error === "店铺不存在或无权访问";
    if (notFound) {
      return internalProductAccessDeniedResponse(result.error, true);
    }

    const conflict =
      result.error === "该平台 SKU 已有启用映射" ||
      result.error === "平台 SKU 已被其他 SHEIN 映射使用";
    return NextResponse.json({ error: result.error }, { status: conflict ? 409 : 400 });
  }

  return NextResponse.json(result, { status: 201 });
}
