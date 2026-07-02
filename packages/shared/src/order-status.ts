import type { StoreOrderStatus } from "./types/sku";

export type OrderDisplayStatus =
  | "unmapped"
  | "pending_ship"
  | "shipped"
  | "in_transit"
  | "delivered"
  | "exception";

export type OrderStatusDisplay = {
  key: OrderDisplayStatus;
  label: string;
  color: "default" | "processing" | "success" | "error" | "warning" | "cyan" | "blue" | "orange" | "purple";
  clickable: boolean;
};

const STATUS_META: Record<
  OrderDisplayStatus,
  Pick<OrderStatusDisplay, "label" | "color" | "clickable">
> = {
  unmapped: { label: "待绑定", color: "blue", clickable: false },
  pending_ship: { label: "待发货", color: "processing", clickable: false },
  shipped: { label: "已发货", color: "blue", clickable: false },
  in_transit: { label: "运输中", color: "cyan", clickable: false },
  delivered: { label: "已签收", color: "success", clickable: false },
  exception: { label: "异常", color: "error", clickable: false },
};

function fromPlatformStatus(platformStatus: string): OrderDisplayStatus {
  if (/签收|妥投|已完成|已签收/.test(platformStatus)) return "delivered";
  if (/运输|在途|派送|转运|清关|干线/.test(platformStatus)) return "in_transit";
  if (/已发货|揽收|出库|已打包|待揽收|已交运|已出库/.test(platformStatus)) return "shipped";
  if (/待发货|待打包|待处理|待确认|未发货/.test(platformStatus)) return "pending_ship";
  if (/异常|取消|关闭|拒收|失败|退款/.test(platformStatus)) return "exception";
  return "pending_ship";
}

function fromInternalStatus(status: StoreOrderStatus): OrderDisplayStatus {
  switch (status) {
    case "SHIPPED":
      return "shipped";
    case "READY":
      return "pending_ship";
    case "EXCEPTION":
      return "exception";
    default:
      return "pending_ship";
  }
}

export function getOrderStatusDisplay(input: {
  status: StoreOrderStatus;
  platformStatus?: string | null;
  unmappedLineCount: number;
}): OrderStatusDisplay {
  if (input.unmappedLineCount > 0) {
    return { key: "exception", label: "待绑定", color: "error", clickable: false };
  }

  if (input.status === "EXCEPTION") {
    return { key: "exception", ...STATUS_META.exception };
  }

  const platformStatus = input.platformStatus?.trim();
  const key = platformStatus ? fromPlatformStatus(platformStatus) : fromInternalStatus(input.status);
  return { key, ...STATUS_META[key] };
}

/** @deprecated Use getOrderStatusDisplay */
export function getOrderShipDisplay(input: {
  status: StoreOrderStatus;
  platformStatus?: string | null;
  unmappedLineCount: number;
}) {
  const display = getOrderStatusDisplay(input);
  return { label: display.label, color: display.color };
}
