export type CompanySkuStatus = "active" | "inactive";

export type ProductAttributeType = "text" | "number";

export type ProductAttribute = {
  key: string;
  type: ProductAttributeType;
  value: string | number;
};

export type CompanySku = {
  id: string;
  internalSku: string;
  companyName: string;
  attributes: ProductAttribute[];
  status: CompanySkuStatus;
  createdAt: string;
  updatedAt: string;
};

export type PlatformSkuMappingStatus = "pending" | "active" | "inactive" | "conflict";

export type PlatformSkuMapping = {
  id: string;
  platform: string;
  storeName: string;
  internalSku: string;
  platformSkc: string;
  platformSku: string;
  sheinProductId: string;
  platformSpu: string;
  sellerSku: string;
  sheinProductName: string;
  status: PlatformSkuMappingStatus;
  remark: string;
  createdAt: string;
  updatedAt: string;
};

export type PageKey =
  | "productManagement"
  | "storeManagement"
  | "inventoryManagement"
  | "orderManagement"
  | "warehouseManagement"
  | "companyManagement"
  | "userManagement"
  | "profile";

export type FormErrors = Record<string, string>;

export type Toast = {
  id: string;
  type: "success" | "error" | "info";
  message: string;
};

export type ConfirmState = {
  title: string;
  description: string;
  confirmText: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
} | null;

export type MasterDataResponse = {
  companySkus: CompanySku[];
  mappings: PlatformSkuMapping[];
};

export type OrderImportResult = {
  total: number;
  mapped: number;
  unmapped: number;
  newSellerSkus: string[];
  importJobId: string;
};

export type UnmappedSkcGroup = {
  groupKey: string;
  platformSkc: string;
  sellerSku: string;
  platformSku: string;
  platformSpu: string;
  sheinProductName: string;
  storeName: string;
  orderCount: number;
  sampleOrderNo: string;
};

/** 待绑定列表行：按订单明细展示，绑定仍按 groupKey 聚合 */
export type UnmappedOrderLine = UnmappedSkcGroup & {
  lineId: string;
  orderNo: string;
  orderCreatedAt: string | null;
  shipBy: string | null;
  deliverBy: string | null;
};

export type OrderBindRequest = {
  platformSkc: string;
  storeName: string;
  internalSku: string;
  sellerSku: string;
  platformSku: string;
  platformSpu: string;
  sheinProductName: string;
  remark: string;
};
export type OrderBindResult = {
  mapping: PlatformSkuMapping;
  updatedLineCount: number;
};

export type SelectOption = {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
};

export type ModalState =
  | { type: "company"; mode: "create" | "edit"; value: CompanySku; errors: FormErrors }
  | { type: "mapping"; mode: "create" | "edit"; value: PlatformSkuMapping; errors: FormErrors }
  | { type: "orderBind"; value: OrderBindRequest; errors: FormErrors }
  | null;

export type StoreRecord = {
  id: string;
  name: string;
  platform: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
};

export type StoreOrderStatus = "PENDING" | "READY" | "SHIPPED" | "EXCEPTION";

export type StoreOrderSummary = {
  id: string;
  orderNo: string;
  createdAt: string;
  shipBy: string | null;
  deliverBy: string | null;
  status: StoreOrderStatus;
  platformStatus: string | null;
  logisticsNo: string | null;
  logisticsCompany: string | null;
  lineCount: number;
  unmappedLineCount: number;
  storeName: string;
};

export type StoreOrderLineDetail = {
  id: string;
  sellerSku: string;
  platformSku: string | null;
  platformSkc: string | null;
  platformSpu: string | null;
  productName: string;
  spec: string | null;
  quantity: number;
  price: number | null;
  mappingStatus: "mapped" | "unmapped";
  internalSku: string | null;
};

export type StoreOrderDetail = StoreOrderSummary & {
  country: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientAddress: string | null;
  recipientPostalCode: string | null;
  lines: StoreOrderLineDetail[];
};

export type StoreOrdersListResponse = {
  orders: StoreOrderSummary[];
  total: number;
  page: number;
  pageSize: number;
};

export type StoreInventoryRow = {
  mappingId: string;
  internalProductId: string | null;
  sellerSku: string;
  internalSku: string;
  productName: string;
  sku: string | null;
  warehouseQty: number | null;
  inTransitQty: number;
  availableQty: number | null;
  warningQuantity: number;
  isLowStock: boolean;
};
