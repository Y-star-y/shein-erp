import * as XLSX from "xlsx";
import type { Order } from "./types";

const aliases: Record<string, string[]> = {
  orderNo: ["GSP订单号", "订单号"],
  createdAt: ["订单创建时间"],
  shipBy: ["要求发货时间"],
  sellerSku: ["卖家SKU"],
  platformSku: ["平台SKU"],
  productName: ["商品名称"],
  spec: ["规格"],
  price: ["商品价格"],
  currency: ["币种"],
  country: ["国家/地区", "国家"],
  warehouse: ["仓库"],
};

function value(row: Record<string, unknown>, key: string) {
  const header = aliases[key].find((name) => row[name] !== undefined);
  return header ? row[header] : undefined;
}

export async function parseSheinExcel(file: File): Promise<Omit<Order, "skuCode" | "status">[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const targetName = workbook.SheetNames.includes("02_SHEIN订单粘贴")
    ? "02_SHEIN订单粘贴"
    : workbook.SheetNames[0];
  const sheet = workbook.Sheets[targetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    range: targetName === "02_SHEIN订单粘贴" ? 3 : 0,
    defval: "",
  });

  if (!rows.length || value(rows[0], "orderNo") === undefined) {
    throw new Error("未找到“GSP订单号”列，请上传 SHEIN 订单导出文件。");
  }

  return rows
    .filter((row) => String(value(row, "orderNo") || "").trim())
    .map((row, index) => ({
      id: `import-${Date.now()}-${index}`,
      orderNo: String(value(row, "orderNo")).trim(),
      createdAt: String(value(row, "createdAt") || ""),
      shipBy: String(value(row, "shipBy") || ""),
      sellerSku: String(value(row, "sellerSku") || "").trim(),
      productName: String(value(row, "productName") || ""),
      spec: String(value(row, "spec") || ""),
      quantity: 1,
      price: Number(value(row, "price") || 0),
      currency: String(value(row, "currency") || ""),
      country: String(value(row, "country") || ""),
      warehouse: String(value(row, "warehouse") || "义乌一仓"),
    }));
}

export function exportRows(filename: string, sheetName: string, rows: Record<string, unknown>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, filename);
}
