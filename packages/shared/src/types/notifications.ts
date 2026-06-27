import type { PageKey } from "./sku";

export type AppNotificationType = "order_bind" | "pending_order";

export type AppNotification = {
  id: string;
  type: AppNotificationType;
  title: string;
  description: string;
  count: number;
  page: PageKey;
  tab?: string;
};

export type NotificationsSummary = {
  items: AppNotification[];
  total: number;
  unmappedCount: number;
  pendingOrderCount: number;
};
