"use client";

import { Badge } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ImportTab } from "./import-tab";
import { UnmappedTab } from "./unmapped-tab";

export function OrderBindingPage({
  onBind,
  unmappedReloadKey = 0,
  unmappedCount = 0,
  activeTab: controlledTab,
  onTabChange,
  onImported: onImportedProp,
}: {
  onBind: (group: import("@shein-erp/shared").UnmappedOrderLine) => void;
  unmappedReloadKey?: number;
  unmappedCount?: number;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onImported?: () => void;
}) {
  const [internalTab, setInternalTab] = useState("import");
  const [unmappedKey, setUnmappedKey] = useState(0);

  const activeTab = controlledTab ?? internalTab;

  const setActiveTab = useCallback(
    (tab: string) => {
      if (onTabChange) {
        onTabChange(tab);
      } else {
        setInternalTab(tab);
      }
    },
    [onTabChange],
  );

  const handleImported = useCallback(() => {
    setUnmappedKey((value) => value + 1);
    setActiveTab("unmapped");
    onImportedProp?.();
  }, [onImportedProp, setActiveTab]);

  useEffect(() => {
    if (controlledTab) {
      setInternalTab(controlledTab);
    }
  }, [controlledTab]);

  const unmappedLabel = useMemo(
    () => (
      <Badge dot={unmappedCount > 0} offset={[4, 0]}>
        <span>待绑定商品</span>
      </Badge>
    ),
    [unmappedCount],
  );

  return (
    <div className="order-binding-tabs">
      <div className="order-binding-tabs__nav">
        <button
          type="button"
          className={`order-binding-tabs__btn${activeTab === "import" ? " is-active" : ""}`}
          onClick={() => setActiveTab("import")}
        >
          订单导入
        </button>
        <button
          type="button"
          className={`order-binding-tabs__btn${activeTab === "unmapped" ? " is-active" : ""}`}
          onClick={() => setActiveTab("unmapped")}
        >
          {unmappedLabel}
        </button>
      </div>

      <div className="order-binding-tabs__body">
        {activeTab === "import" ? (
          <ImportTab onImported={handleImported} />
        ) : (
          <UnmappedTab key={unmappedKey} reloadKey={unmappedReloadKey + unmappedKey} onBind={onBind} />
        )}
      </div>
    </div>
  );
}
