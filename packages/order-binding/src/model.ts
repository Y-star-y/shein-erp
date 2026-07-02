import type { OrderBindRequest, UnmappedSkcGroup } from "@shein-erp/shared";

export function createBindRequest(group: UnmappedSkcGroup): OrderBindRequest {
  return {
    platformSkc: group.platformSkc,
    storeName: group.storeName,
    internalProductId: "",
    platformSku: group.platformSku,
    platformSpu: group.platformSpu,
    sheinProductName: group.sheinProductName,
    spec: group.spec,
    articleNo: group.articleNo,
    remark: "",
  };
}

export function validateBindRequest(value: OrderBindRequest) {
  const errors: Record<string, string> = {};

  if (!value.storeName.trim()) errors.storeName = "店铺不能为空";
  if (!value.platformSku.trim()) errors.platformSku = "平台 SKU 不能为空";
  if (!value.internalProductId.trim()) errors.internalProductId = "必须选择内部商品";

  return errors;
}
