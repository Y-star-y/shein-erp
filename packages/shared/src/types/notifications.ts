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

export type OrderQuickFilter = "all" | "unmapped" | "pending_ship" | "shipped";

export type StoreDetailTab =
  | "orders"
  | "inventory"
  | "exceptions"
  | "settings"
  | "shipping"
  | "aftersales"
  /** @deprecated 已合并至订单管理 */
  | "binding";

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
