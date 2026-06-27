export type CompanySkuStatus = "active" | "inactive";

export type CompanySku = {
  id: string;
  internalSku: string;
  productGroupName: string;
  productNameCn: string;
  status: CompanySkuStatus;
  specification: string;
  color: string;
  size: string;
  model: string;
  imageUrl: string;
  supplierUrl: string;
  defaultWarningQuantity: string;
  source: "manual" | "shein_order";
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
  | "platformMappings"
  | "warehouseManagement"
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
};

export type OrderBindNewProduct = {
  internalSku: string;
  productNameCn: string;
  productGroupName: string;
  specification: string;
  color: string;
  size: string;
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
  productMode: "existing" | "create";
  newProduct: OrderBindNewProduct;
};
export type OrderBindResult = {
  mapping: PlatformSkuMapping;
  updatedLineCount: number;
  companySku?: CompanySku;
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
