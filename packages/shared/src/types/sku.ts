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

export type MaintenanceEvent = {
  id: string;
  action: string;
  targetType: "companySku" | "platformMapping";
  targetCode: string;
  detail: string;
  createdAt: string;
};

export type PageKey = "dashboard" | "companySku" | "platformMappings";

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

export type SelectOption = {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
};

export type ModalState =
  | { type: "company"; mode: "create" | "edit"; value: CompanySku; errors: FormErrors }
  | { type: "mapping"; mode: "create" | "edit"; value: PlatformSkuMapping; errors: FormErrors }
  | null;
