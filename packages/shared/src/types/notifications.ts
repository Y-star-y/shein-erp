import type { PageKey } from "./sku";

export type OpsTodoTaskId =
  | "order_bind"
  | "pending_ship"
  | "after_sales"
  | "shipment_exception";

export type OpsTodoTaskSummary = {
  id: OpsTodoTaskId;
  title: string;
  description: string;
  count: number;
  implemented: boolean;
};

export type OpsTodosResponse = {
  tasks: OpsTodoTaskSummary[];
};

export type OrderQuickFilter = "all" | "pending_ship" | "shipped" | "unmapped";

export type StoreDetailTab =
  | "orders"
  | "binding"
  | "exceptions"
  | "finance"
  | "history"
  | "settings"
  | "shipping"
  | "aftersales"
  /** @deprecated 店铺详情已移除库存管理 Tab */
  | "inventory";

export type StoreOpenTarget = {
  storeId: string;
  tab?: StoreDetailTab;
  ordersFilter?: OrderQuickFilter;
};

export type AppNotificationType = "order_bind" | "pending_order";

export type AppNotification = {
  id: string;
  type: AppNotificationType;
  title: string;
  description: string;
  count: number;
  page: PageKey;
  tab?: string;
  taskId?: OpsTodoTaskId;
  storeTarget?: StoreOpenTarget;
};

export type NotificationsSummary = {
  items: AppNotification[];
  total: number;
  unmappedCount: number;
  pendingOrderCount: number;
};
