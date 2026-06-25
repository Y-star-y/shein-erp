import * as XLSX from "xlsx";
import type { InventorySnapshot, Order, SheinOrderMappingResult } from "./types";

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

const inventoryRequiredHeaders = ["seller sku", "仓库名称", "代发库存"];

function text(value: unknown) {
  return String(value ?? "").trim();
}

function numberValue(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const normalized = String(value).replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

const sheinColumnAliases = {
  storeName: ["店铺名称", "店铺名", "店铺"],
  sellerSku: ["卖家SKU", "seller sku", "sellerSku", "商品SKU"],
  platformSku: ["平台SKU", "平台sku", "平台Sku"],
  platformSkc: ["平台SKC", "平台skc", "平台Skc"],
  platformSpu: ["平台SPU", "平台spu", "平台Spu"],
  quantity: ["数量", "商品数量", "购买数量", "订单数量", "qty", "Qty"],
  orderNo: ["GSP订单号", "订单号", "订单号码"],
  recipientName: ["收件人姓名", "用户名称", "收货人", "收货人姓名", "用户姓名"],
  recipientFirstName: ["用户名字", "名字"],
  recipientLastName: ["用户姓氏", "姓氏"],
  recipientPhone: ["收件人电话", "手机号", "手机号码", "电话", "用户电话"],
  recipientAddress: ["收件人地址（一二三）", "收件人地址", "用户地址", "详细地址", "地址"],
  recipientAddress1: ["用户地址1", "收件人地址1", "地址1"],
  recipientAddress2: ["用户地址2", "收件人地址2", "地址2"],
  recipientAddress3: ["用户地址3", "收件人地址3", "地址3"],
  recipientPostalCode: ["收件人邮编", "邮编", "邮政编码", "postcode", "zip"],
  productName: ["商品名称", "产品名称", "商品品名"],
  orderCreatedAt: ["订单创建时间", "创建时间", "下单时间"],
  warehouseName: ["仓库名称", "仓库"],
  shippingChannel: ["发货渠道（投函/小包）", "发货渠道", "物流渠道"],
  processingStatus: ["可筛选-处理状态（待打包/已...）", "处理状态", "订单状态"],
  logisticsNo: ["物流单号", "运单号", "国际物流单号"],
  logisticsCompany: ["物流公司", "承运商"],
  trackingUploadStatus: ["可筛选-单号回传状态（已处...）", "单号回传状态", "回传状态"],
  remark: ["备注"],
};

function normalizeHeader(value: unknown) {
  return text(value).replace(/\s+/g, "").toLowerCase();
}

function findColumnIndex(headers: string[], candidates: string[]) {
  const normalizedCandidates = candidates.map(normalizeHeader).filter(Boolean);

  if (!normalizedCandidates.length) return -1;

  const exactIndex = headers.findIndex((header) => normalizedCandidates.includes(normalizeHeader(header)));

  if (exactIndex >= 0) return exactIndex;

  return headers.findIndex((header) => {
    const normalizedHeader = normalizeHeader(header);
    if (!normalizedHeader) return false;
    return normalizedCandidates.some((candidate) => normalizedHeader.includes(candidate));
  });
}

function readCell(row: unknown[], index: number) {
  return index >= 0 ? text(row[index]) : "";
}

function readByAliases(headers: string[], row: unknown[], candidates: string[]) {
  return readCell(row, findColumnIndex(headers, candidates));
}

function joinCells(values: string[]) {
  return values.filter(Boolean).join(" ");
}

function sheetMatrix(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
}

function findSheinHeaderRow(rows: unknown[][]) {
  return rows.findIndex((row) => {
    const headers = row.map(text);
    const productNameIndex = findColumnIndex(headers, sheinColumnAliases.productName);
    const skuIndex = [
      ...sheinColumnAliases.sellerSku,
      ...sheinColumnAliases.platformSku,
      ...sheinColumnAliases.platformSkc,
      ...sheinColumnAliases.platformSpu,
    ].some((candidate) => findColumnIndex(headers, [candidate]) >= 0);

    return productNameIndex >= 0 && skuIndex;
  });
}

export async function parseSheinOrderMappingExcel(file: File): Promise<SheinOrderMappingResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheetCandidates = workbook.SheetNames.map((name) => ({
    name,
    rows: sheetMatrix(workbook.Sheets[name]),
  }));
  const target = sheetCandidates.find((sheet) => findSheinHeaderRow(sheet.rows) >= 0) || sheetCandidates[0];

  if (!target) {
    throw new Error("未读取到 Excel 工作表，请检查文件内容。");
  }

  const headerRowIndex = findSheinHeaderRow(target.rows);

  if (headerRowIndex < 0) {
    throw new Error("未找到 SHEIN 订单表头，请确认文件包含“卖家SKU/平台SKU”和“商品名称”等列。");
  }

  const headers = target.rows[headerRowIndex].map(text);
  const sellerSkuIndex = findColumnIndex(headers, sheinColumnAliases.sellerSku);
  const platformSkuIndex = findColumnIndex(headers, sheinColumnAliases.platformSku);
  const platformSkcIndex = findColumnIndex(headers, sheinColumnAliases.platformSkc);
  const platformSpuIndex = findColumnIndex(headers, sheinColumnAliases.platformSpu);
  const productNameIndex = findColumnIndex(headers, sheinColumnAliases.productName);

  if (productNameIndex < 0 || [sellerSkuIndex, platformSkuIndex, platformSkcIndex, platformSpuIndex].every((index) => index < 0)) {
    throw new Error("SHEIN 订单缺少核心列：至少需要“商品名称”和一个 SKU 列。");
  }

  const dataRows = target.rows
    .slice(headerRowIndex + 1)
    .filter((row) => row.some((cell) => text(cell)));

  const rows = dataRows
    .map((row, index) => {
      const productSku =
        readCell(row, sellerSkuIndex) ||
        readCell(row, platformSkuIndex) ||
        readCell(row, platformSkcIndex) ||
        readCell(row, platformSpuIndex);
      const recipientName =
        readByAliases(headers, row, sheinColumnAliases.recipientName) ||
        joinCells([
          readByAliases(headers, row, sheinColumnAliases.recipientLastName),
          readByAliases(headers, row, sheinColumnAliases.recipientFirstName),
        ]);
      const recipientAddress =
        readByAliases(headers, row, sheinColumnAliases.recipientAddress) ||
        joinCells([
          readByAliases(headers, row, sheinColumnAliases.recipientAddress1),
          readByAliases(headers, row, sheinColumnAliases.recipientAddress2),
          readByAliases(headers, row, sheinColumnAliases.recipientAddress3),
        ]);
      const quantity = readByAliases(headers, row, sheinColumnAliases.quantity) || "1";

      return {
        id: `shein-map-${Date.now()}-${index}`,
        companyName: "",
        storeName: readByAliases(headers, row, sheinColumnAliases.storeName),
        operatorName: "",
        image: "",
        productSku,
        quantity,
        orderNo: readByAliases(headers, row, sheinColumnAliases.orderNo),
        recipientName,
        recipientPhone: readByAliases(headers, row, sheinColumnAliases.recipientPhone),
        recipientAddress,
        recipientPostalCode: readByAliases(headers, row, sheinColumnAliases.recipientPostalCode),
        productName: readCell(row, productNameIndex),
        orderCreatedAt: readByAliases(headers, row, sheinColumnAliases.orderCreatedAt),
        orderSignedAt: "",
        orderOperatedAt: "",
        warehouseName: readByAliases(headers, row, sheinColumnAliases.warehouseName),
        shippingChannel: "",
        processingStatus: "",
        logisticsNo: "",
        logisticsCompany: "",
        trackingUploadStatus: "",
        remark: "",
      };
    })
    .filter((row) => row.productSku || row.productName || row.orderNo);

  if (!rows.length) {
    throw new Error("已识别 SHEIN 表头，但没有找到可映射的订单明细。");
  }

  return {
    filename: file.name,
    importedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
    totalRows: dataRows.length,
    mappedRows: rows.length,
    rows,
  };
}

export async function parseInventoryExcel(file: File): Promise<Omit<InventorySnapshot, "skuCode" | "matchedStatus">[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const first = rows[0] || {};
  const missing = inventoryRequiredHeaders.filter((header) => !(header in first));

  if (!rows.length || missing.length) {
    throw new Error(`库存表缺少必要列：${missing.join("、") || inventoryRequiredHeaders.join("、")}`);
  }

  return rows
    .filter((row) => text(row["seller sku"]) || text(row["Fnsku"]))
    .map((row, index) => ({
      id: `inventory-${Date.now()}-${index}`,
      fnsku: text(row["Fnsku"]),
      sellerSku: text(row["seller sku"]),
      productName: text(row["产品名称"]),
      warehouseName: text(row["仓库名称"]),
      dropshipTransitQty: numberValue(row["代发途中"]),
      dropshipStockQty: numberValue(row["代发库存"]),
      transferTransitQty: numberValue(row["中转途中"]),
      transferStockQty: numberValue(row["中转库存"]),
      pendingQty: numberValue(row["待处理库存"]),
      sales10d: numberValue(row["10天销量"]),
      sales30d: numberValue(row["30天销量"]),
      stockAgeDays: numberValue(row["库龄(天)"]),
      volume: numberValue(row["体积"]),
      sourceWarningQty: numberValue(row["库存预警"]),
      inboundAt: text(row["入仓时间"]),
    }));
}

export function exportRows(filename: string, sheetName: string, rows: Record<string, unknown>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, filename);
}
