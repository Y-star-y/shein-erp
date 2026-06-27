import type { OrderBindNewProduct, OrderBindRequest, UnmappedSkcGroup } from "@shein-erp/shared";

export function createNewProductFromOrder(group: UnmappedSkcGroup): OrderBindNewProduct {
  return {
    internalSku: group.sellerSku || group.platformSku,
    productNameCn: group.sheinProductName,
    productGroupName: "",
    specification: "",
    color: "",
    size: "",
  };
}

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
    productMode: "existing",
    newProduct: createNewProductFromOrder(group),
  };
}

export function validateBindRequest(value: OrderBindRequest) {
  const errors: Record<string, string> = {};

  if (!value.storeName.trim()) errors.storeName = "店铺不能为空";
  if (!value.sellerSku.trim() && !value.platformSku.trim()) {
    errors.sellerSku = "卖家 SKU 与平台 SKU 至少填写一项";
  }

  if (value.productMode === "existing") {
    if (!value.internalSku.trim()) errors.internalSku = "必须选择内部商品";
  } else {
    if (!value.newProduct.internalSku.trim()) errors["newProduct.internalSku"] = "内部商品编码不能为空";
    if (!value.newProduct.productNameCn.trim()) errors["newProduct.productNameCn"] = "商品名称不能为空";
  }

  return errors;
}
