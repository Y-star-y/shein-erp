import type { ParsedSheinOrderLine } from "@shein-erp/core";

import { resolveOrderLineMapping, type OrderLineMappingRef } from "@shein-erp/core";

import type { OrderStatus } from "@prisma/client";



/** 根据 SHEIN 处理状态推断内部订单状态 */

export function deriveOrderStatusFromPlatform(platformStatus: string): OrderStatus {

  const status = platformStatus.trim();

  if (!status) return "PENDING";

  if (/异常|取消|关闭|拒收|失败|退款/.test(status)) return "EXCEPTION";

  if (/签收|妥投|已完成|已签收/.test(status)) return "SHIPPED";

  if (/已发货|运输|在途|揽收|派送|已打包|待揽收|已交运|已出库/.test(status)) return "SHIPPED";

  if (/待发货|待打包/.test(status)) return "READY";

  return "PENDING";

}



/** 解析 Excel / 文本中的日期时间，支持常见字符串与 Excel 序列号 */

export function parseOptionalDate(value: string) {

  const trimmed = value.trim();

  if (!trimmed) {

    return null;

  }



  const serial = Number(trimmed.replace(/,/g, ""));

  if (Number.isFinite(serial) && serial > 20_000 && serial < 100_000) {

    const utcMs = Math.round((serial - 25_569) * 86_400_000);

    const fromSerial = new Date(utcMs);

    if (!Number.isNaN(fromSerial.getTime())) {

      return fromSerial;

    }

  }



  const direct = new Date(trimmed);

  if (!Number.isNaN(direct.getTime())) {

    return direct;

  }



  const normalized = trimmed

    .replace(/\//g, "-")

    .replace(/(\d{4}-\d{1,2}-\d{1,2})\s+(\d{1,2}:\d{2}(?::\d{2})?)/, "$1T$2")

    .replace(/(\d{4}-\d{1,2}-\d{1,2})(\d{1,2}:\d{2}(?::\d{2})?)/, "$1T$2");



  const parsed = new Date(normalized.includes("T") ? normalized : normalized.replace(" ", "T"));

  return Number.isNaN(parsed.getTime()) ? null : parsed;

}



export function parseImportDate(value: string) {

  return parseOptionalDate(value) ?? new Date();

}



/** 规范化导入行：平台 SKU 为业务键；卖家 SKU 仅归档（有则保留） */

export function normalizeOrderLineKey(line: ParsedSheinOrderLine) {

  const platformSku = line.platformSku.trim();

  const archivedSellerSku = line.sellerSku.trim();



  return {

    ...line,

    platformSku,

    sellerSku: archivedSellerSku,

    platformSkc: line.platformSkc.trim(),

  };

}



export function resolveImportOrderLineMapping(

  line: { platformSku: string },

  mappings: OrderLineMappingRef[],

) {

  return resolveOrderLineMapping({ sellerSku: "", platformSku: line.platformSku.trim() }, mappings);

}


