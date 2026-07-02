"use client";

import type { StoreRecord, UnmappedOrderLine } from "@shein-erp/shared";
import { StoreOrdersTab } from "./store-orders-tab";

export function StoreExceptionOrdersTab({
  store,
  onBind,
  bindReloadKey = 0,
}: {
  store: StoreRecord;
  onBind?: (line: UnmappedOrderLine) => void;
  bindReloadKey?: number;
}) {
  return (
    <StoreOrdersTab
      bindReloadKey={bindReloadKey}
      store={store}
      variant="exceptions"
      onBind={onBind}
    />
  );
}
