export type Sku = {
  id: string;
  code: string;
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

export type Movement = {
  id: string;
  date: string;
  warehouse: string;
  skuCode: string;
  type: string;
  inbound: number;
  outbound: number;
  referenceNo: string;
  reason: string;
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
  movements: Movement[];
  shipments: Shipment[];
  shipmentDrafts: ShipmentDraft[];
  purchases: Purchase[];
  audits: Audit[];
  warehouses: string[];
};

export type PageKey =
  | "dashboard"
  | "products"
  | "orders"
  | "shipments"
  | "inventory"
  | "replenishment"
  | "purchases"
  | "exceptions";
