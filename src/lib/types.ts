export type Sku = {
  id: string;
  code: string;
  fnsku: string;
  sellerSku: string;
  platformSku: string;
  platformSkc: string;
  platformSpu: string;
  name: string;
  spec: string;
  sellerCode: string;
  shippingName: string;
  shippingMethod: string;
  imageUrl: string;
  supplier: string;
  purchaseLink: string;
  purchasePrice: number;
  leadTimeDays: number;
  safetyDays: number;
  safetyStock: number;
  reorderPoint: number;
  targetStock: number;
  confirmStatus: string;
  owner: string;
};

export type Order = {
  id: string;
  orderNo: string;
  createdAt: string;
  shipBy: string;
  sellerSku: string;
  skuCode?: string;
  productName: string;
  spec: string;
  quantity: number;
  price: number;
  currency: string;
  country: string;
  warehouse: string;
  status: "待发货" | "已发货" | "异常";
};

export type Stock = {
  warehouse: string;
  skuCode: string;
  quantity: number;
};

export type InventorySnapshot = {
  id: string;
  fnsku: string;
  sellerSku: string;
  skuCode?: string;
  productName: string;
  warehouseName: string;
  dropshipTransitQty: number;
  dropshipStockQty: number;
  transferTransitQty: number;
  transferStockQty: number;
  pendingQty: number;
  sales10d: number;
  sales30d: number;
  stockAgeDays: number;
  volume: number;
  sourceWarningQty: number;
  inboundAt: string;
  matchedStatus: "已匹配" | "未匹配";
};

export type InventoryImportJob = {
  id: string;
  filename: string;
  importedAt: string;
  totalRows: number;
  matchedRows: number;
  exceptionRows: number;
};

export type SheinMappedRow = {
  id: string;
  companyName: string;
  storeName: string;
  operatorName: string;
  image: string;
  productSku: string;
  quantity: string;
  orderNo: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientPostalCode: string;
  productName: string;
  orderCreatedAt: string;
  orderSignedAt: string;
  orderOperatedAt: string;
  warehouseName: string;
  shippingChannel: string;
  processingStatus: string;
  logisticsNo: string;
  logisticsCompany: string;
  trackingUploadStatus: string;
  remark: string;
};

export type SheinOrderMappingResult = {
  filename: string;
  importedAt: string;
  totalRows: number;
  mappedRows: number;
  rows: SheinMappedRow[];
};

export type ProductWarehouseStock = {
  warehouseName: string;
  totalStock: string;
  transitStock: string;
  warningStandard: string;
  stockStatus: string;
};

export type ProductSku = {
  id: string;
  sku: string;
  imageUrl: string;
  productName: string;
  shippingName: string;
  warehouse?: string;
  totalStock?: string;
  transitStock?: string;
  warningStandard?: string;
  stockStatus?: string;
  warehouseStocks: ProductWarehouseStock[];
  unitPrice: string;
  supplierLink: string;
  purchaseLeadTime: string;
  storeName: string;
  status: "待补全" | "已确认";
  source: "手动新增" | "SHEIN订单";
  createdAt: string;
  updatedAt: string;
};

export type Movement = {
  id: string;
  date: string;
  warehouse: string;
  skuCode: string;
  sellerSku: string;
  type: string;
  inbound: number;
  outbound: number;
  referenceNo: string;
  reason: string;
  beforeQty: number;
  afterQty: number;
};

export type Shipment = {
  id: string;
  shipmentNo: string;
  warehouse: string;
  orderIds: string[];
  status: "草稿" | "已出库";
  createdAt: string;
  confirmedAt?: string;
};

export type ShipmentDraft = {
  orderId: string;
  operationStore: string;
  shipDate: string;
  shippingChannel: string;
  domesticTrackNo: string;
  issuedAt: string;
  operatedAt: string;
  internationalNo: string;
  weightKg: number;
  remark: string;
  combinedLabel: string;
  outboundStatus: "待出库" | "已出库";
  freight: number;
};

export type Purchase = {
  id: string;
  purchaseNo: string;
  skuCode: string;
  quantity: number;
  receivedQty: number;
  unitPrice: number;
  supplier: string;
  expectedAt: string;
  status: "草稿" | "已下单" | "部分到货" | "已完成" | "已取消";
  carrier: string;
  domesticTrackNo: string;
  internationalNo: string;
};

export type Audit = {
  id: string;
  date: string;
  action: string;
  detail: string;
};

export type ErpState = {
  skus: Sku[];
  orders: Order[];
  stocks: Stock[];
  inventorySnapshots: InventorySnapshot[];
  inventoryImportJobs: InventoryImportJob[];
  movements: Movement[];
  shipments: Shipment[];
  shipmentDrafts: ShipmentDraft[];
  purchases: Purchase[];
  audits: Audit[];
  warehouses: string[];
};

export type PageKey =
  | "productInfo"
  | "inboundLog"
  | "outboundLog"
  | "orderImport"
  | "trackingUpload"
  | "orderExceptions"
  | "returns"
  | "stockValue"
  | "skuSales"
  | "turnover";
