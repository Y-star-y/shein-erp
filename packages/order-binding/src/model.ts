import type { OrderBindRequest, UnmappedSkcGroup } from "@shein-erp/shared";

export function createBindRequest(group: UnmappedSkcGroup): OrderBindRequest {
  return {
    platformSkc: group.platformSkc,
    storeName: group.storeName,
    internalSku: "",
    sellerSku: group.sellerSku,
    platformSku: group.platformSku,
    platformSpu: group.platformSpu,
    sheinProductName: group.sheinProductName,
    remark: "",
  };
}

export function validateBindRequest(value: OrderBindRequest) {
  const errors: Record<string, string> = {};

  if (!value.storeName.trim()) errors.storeName = "店铺不能为空";
  if (!value.sellerSku.trim()) errors.sellerSku = "卖家 SKU 不能为空";
  if (!value.internalSku.trim()) errors.internalSku = "必须选择内部商品";

  return errors;
}
