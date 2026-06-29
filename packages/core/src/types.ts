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
  sellerSku: string;
  platformSku: string;
  platformSkc: string;
  platformSpu: string;
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

export type ParsedSheinOrderLine = {
  orderNo: string;
  createdAt: string;
  shipBy: string;
  deliverBy: string;
  sellerSku: string;
  platformSku: string;
  platformSkc: string;
  platformSpu: string;
  productName: string;
  spec: string;
  quantity: number;
  price: number;
  currency: string;
  country: string;
  storeName: string;
  warehouse: string;
  processingStatus: string;
  logisticsNo: string;
  logisticsCompany: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientPostalCode: string;
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
  sourceSkuAliases?: string[];
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

export type CompanySkuStatus = "active" | "inactive";

export type CompanySku = {
  id: string;
  platformSkc: string;
  productNameCn: string;
  status: CompanySkuStatus;
  specification: string;
  color: string;
  model: string;
  imageUrl: string;
  supplierUrl: string;
  source: "manual";
  createdAt: string;
  updatedAt: string;
};

export type PlatformSkuMappingStatus = "active" | "inactive";

export type PlatformSkuMapping = {
  id: string;
  platform: string;
  platformSku: string;
  platformSkc: string;
  sheinProductId: string;
  platformSpu: string;
  sellerSku: string;
  sheinProductName: string;
  status: PlatformSkuMappingStatus;
  remark: string;
  createdAt: string;
  updatedAt: string;
};

export type SkuMapping = {
  id: string;
  sourceSku: string;
  storeName: string;
  operatorName: string;
  platformSku: string;
  platformSkc: string;
  platformSpu: string;
  companySku: string;
  productName: string;
  matchStatus: "待确认" | "已确认" | "冲突";
  confidence: number;
  matchedBy: "公司SKU" | "历史映射" | "来源SKU" | "人工确认";
  remark: string;
  source: "SHEIN订单" | "手动维护";
  createdAt: string;
  updatedAt: string;
};

export type OrderTaskStatus =
  | "待映射SKU"
  | "待分配"
  | "正常待发货"
  | "异常待发货"
  | "已出库"
  | "待回传"
  | "已完成";

export type OrderRiskTag =
  | "库存不足"
  | "负库存"
  | "无路上库存"
  | "签收延迟风险"
  | "需采购"
  | "需人工确认"
  | "渠道不可用";

export type AllocationRule = {
  id: string;
  regionType: "常规地区" | "偏远地区" | "关东地区" | "未知地区" | "全部地区";
  warehouseName: string;
  channelName: string;
  normalDays: number;
  remoteDays: number;
  enabled: boolean;
  priority: number;
};

export type AllocationResult = {
  assignedWarehouse: string;
  shippingChannel: string;
  canMeetSla: boolean;
  stockEnough: boolean;
  riskTags: OrderRiskTag[];
  explainLines: string[];
};

export type OrderTask = {
  id: string;
  orderNo: string;
  storeName: string;
  sourceSku: string;
  companySku: string;
  mappingStatus: SkuMapping["matchStatus"] | "未匹配";
  productName: string;
  quantity: number;
  warehouseName: string;
  assignedWarehouse: string;
  shippingChannel: string;
  regionType: "常规地区" | "偏远地区" | "关东地区" | "未知地区";
  signDeadline: string;
  latestShipDate: string;
  currentStock: number;
  transitStock: number;
  status: OrderTaskStatus;
  riskTags: OrderRiskTag[];
  allocationResult: AllocationResult;
  nextAction: string;
  logisticsNo: string;
  logisticsCompany: string;
  createdAt: string;
};

export type StockBalance = {
  id: string;
  warehouseName: string;
  sku: string;
  productName: string;
  availableQty: number;
  transitQty: number;
  warningQty: number;
};

export type InventoryLog = {
  id: string;
  type: "入库" | "出库" | "调整";
  warehouseName: string;
  companyName: string;
  referenceNo: string;
  sku: string;
  productName: string;
  quantity: number;
  operator: string;
  operatedAt: string;
  remark: string;
};

export type PurchaseSuggestion = {
  id: string;
  sku: string;
  productName: string;
  supplier: string;
  currentStock: number;
  sales7d: number;
  sales30d: number;
  transitQty: number;
  leadTimeDays: number;
  safetyStock: number;
  suggestedQty: number;
  status: "建议采购" | "已生成采购单";
};

export type PurchaseOrderStatus = "已生成采购单" | "已下单" | "在途" | "部分到货" | "已完成" | "已对账";

export type PurchaseOrder = {
  id: string;
  purchaseNo: string;
  sku: string;
  productName: string;
  supplier: string;
  quantity: number;
  unitPrice: number;
  expectedAt: string;
  status: PurchaseOrderStatus;
};

export type PurchaseArrival = {
  id: string;
  purchaseNo: string;
  sku: string;
  warehouseName: string;
  arrivedQty: number;
  qualifiedQty: number;
  rejectedQty: number;
  arrivedAt: string;
  status: "待验收" | "已入库";
};

export type Supplier = {
  id: string;
  name: string;
  contactName: string;
  wechat: string;
  leadTimeDays: number;
  minOrderQty: number;
  settlementType: string;
  score: number;
};

export type FinanceLedger = {
  id: string;
  orderNo: string;
  sku: string;
  revenue: number;
  productCost: number;
  logisticsCost: number;
  platformFee: number;
  otherFee: number;
  grossProfit: number;
  status: "待核算" | "已归集成本" | "已核算利润" | "已对账";
};

export type SupplierStatement = {
  id: string;
  supplier: string;
  purchaseNo: string;
  arrivedQty: number;
  payableAmount: number;
  paidAmount: number;
  differenceAmount: number;
  status: "待对账" | "有差异" | "已对账";
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
  | "dashboard"
  | "companySku"
  | "platformMappings";
