"use client";

import { isSkuIncomplete } from "@shein-erp/company-sku";
import {
  EmptyBlock,
  Panel,
  StatusTag,
  useErpStore,
  type PageKey,
} from "@shein-erp/shared";
import { Button, Card, Statistic } from "antd";
import {
  Activity,
  AlertCircle,
  Clock3,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { useMemo } from "react";

export function OpsConsolePage({
  onCreateCompanySku,
  onCreateMapping,
  allowedPages,
}: {
  onCreateCompanySku: () => void;
  onCreateMapping: () => void;
  allowedPages: PageKey[];
}) {
  const { companySkus, mappings, setPage, activeCompanySkus } = useErpStore();

  const canAccess = (page: PageKey) => allowedPages.includes(page);
  const canCreateCompanySku = canAccess("productManagement");
  const canCreateMapping = canAccess("platformMappings");

  const inactiveCompanySkus = useMemo(() => companySkus.filter((item) => item.status === "inactive"), [companySkus]);
  const incompleteSkus = useMemo(() => companySkus.filter(isSkuIncomplete), [companySkus]);
  const pendingMappings = useMemo(() => mappings.filter((item) => item.status === "pending"), [mappings]);
  const conflictMappings = useMemo(() => mappings.filter((item) => item.status === "conflict"), [mappings]);

  const onJump = (page: PageKey) => {
    if (canAccess(page)) {
      setPage(page);
    }
  };

  const cards = [
    { label: "内部商品", value: companySkus.length, icon: Package, tone: "blue", visible: canCreateCompanySku },
    { label: "启用商品", value: activeCompanySkus.length, icon: ShieldCheck, tone: "green", visible: canCreateCompanySku },
    { label: "停用商品", value: inactiveCompanySkus.length, icon: AlertCircle, tone: "orange", visible: canCreateCompanySku },
    { label: "待完善资料", value: incompleteSkus.length, icon: Clock3, tone: "amber", visible: canCreateCompanySku },
    { label: "SHEIN映射", value: mappings.length, icon: Tag, tone: "violet", visible: canCreateMapping },
    { label: "待绑定/冲突", value: pendingMappings.length + conflictMappings.length, icon: Activity, tone: "slate", visible: canCreateMapping },
  ].filter((card) => card.visible);

  return (
    <div className="page-stack">
      <Card className="hero-panel" variant="borderless">
        <div>
          <span className="eyebrow">运营工作台</span>
          <h2>先把商品映射基础资料打稳</h2>
          <p>
            内部商品是真实库存商品；SHEIN SKC 是各店铺上架后返回的平台身份，需要映射回内部商品。
          </p>
        </div>
        {(canCreateCompanySku || canCreateMapping) && (
          <div className="hero-actions">
            {canCreateCompanySku ? (
              <Button icon={<Plus size={16} />} type="primary" onClick={onCreateCompanySku}>
                新增内部商品
              </Button>
            ) : null}
            {canCreateMapping ? (
              <Button icon={<Tag size={16} />} onClick={onCreateMapping}>
                新增 SHEIN 映射
              </Button>
            ) : null}
          </div>
        )}
      </Card>

      {cards.length > 0 ? (
        <section className="metric-grid">
          {cards.map((card) => (
            <Card className="metric-card" key={card.label}>
              <div className={`metric-icon ${card.tone}`}>
                <card.icon size={18} />
              </div>
              <Statistic title={card.label} value={card.value} />
            </Card>
          ))}
        </section>
      ) : null}

      <section className="dashboard-grid">
        {canCreateCompanySku ? (
          <Panel title="待完善内部商品" count={incompleteSkus.length} action={<Button onClick={() => onJump("productManagement")}>查看内部商品</Button>}>
            <div className="mini-list">
              {incompleteSkus.slice(0, 8).map((item) => (
                <Button className="mini-row" key={item.id} onClick={() => onJump("productManagement")}>
                  <span>
                    <strong>{item.internalSku}</strong>
                    <em>{item.productNameCn}</em>
                  </span>
                  <StatusTag value="待完善" tone="warning" />
                </Button>
              ))}
              {!incompleteSkus.length && <EmptyBlock icon={<Package size={22} />} title="暂无待完善商品" text="启用商品的建议字段都已经补齐。" />}
            </div>
          </Panel>
        ) : null}
      </section>

      {(canCreateCompanySku || canCreateMapping) && (
        <section className="shortcut-grid">
          {canCreateCompanySku ? (
            <Button icon={<Package size={18} />} onClick={onCreateCompanySku}>
              新增内部商品
            </Button>
          ) : null}
          {canCreateMapping ? (
            <Button icon={<Tag size={18} />} onClick={onCreateMapping}>
              新增 SHEIN 映射
            </Button>
          ) : null}
          {canCreateMapping ? (
            <Button icon={<RefreshCw size={18} />} onClick={() => onJump("platformMappings")}>
              查看映射表
            </Button>
          ) : null}
        </section>
      )}
    </div>
  );
}
