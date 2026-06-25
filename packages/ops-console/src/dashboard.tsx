"use client";

import { isSkuIncomplete } from "@shein-erp/company-sku";
import {
  EmptyBlock,
  Panel,
  StatusTag,
  useErpStore,
  type PageKey,
} from "@shein-erp/shared";
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
}: {
  onCreateCompanySku: () => void;
  onCreateMapping: () => void;
}) {
  const { companySkus, mappings, events, setPage, activeCompanySkus } = useErpStore();

  const inactiveCompanySkus = useMemo(() => companySkus.filter((item) => item.status === "inactive"), [companySkus]);
  const incompleteSkus = useMemo(() => companySkus.filter(isSkuIncomplete), [companySkus]);

  const onJump = (page: PageKey) => setPage(page);

  const cards = [
    { label: "公司 SKU 总数", value: companySkus.length, icon: Package, tone: "blue" },
    { label: "启用 SKU", value: activeCompanySkus.length, icon: ShieldCheck, tone: "green" },
    { label: "停用 SKU", value: inactiveCompanySkus.length, icon: AlertCircle, tone: "orange" },
    { label: "待完善资料", value: incompleteSkus.length, icon: Clock3, tone: "amber" },
    { label: "平台映射数", value: mappings.length, icon: Tag, tone: "violet" },
    { label: "待处理订单", value: 0, icon: Activity, tone: "slate" },
  ];

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">运营工作台</span>
          <h2>先把 SKU 地基搭稳</h2>
          <p>第一阶段只维护公司 SKU 和平台 SKU 映射。订单、物流、采购、财务先不接入，避免系统一开始就变重。</p>
        </div>
        <div className="hero-actions">
          <button className="primary-btn" onClick={onCreateCompanySku}>
            <Plus size={16} />
            新增公司 SKU
          </button>
          <button className="secondary-btn" onClick={onCreateMapping}>
            <Tag size={16} />
            新增平台映射
          </button>
        </div>
      </section>

      <section className="metric-grid">
        {cards.map((card) => (
          <article className="metric-card" key={card.label}>
            <div className={`metric-icon ${card.tone}`}>
              <card.icon size={18} />
            </div>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <Panel title="待完善 SKU" count={incompleteSkus.length} action={<button onClick={() => onJump("companySku")}>查看公司 SKU</button>}>
          <div className="mini-list">
            {incompleteSkus.slice(0, 8).map((item) => (
              <button className="mini-row" key={item.id} onClick={() => onJump("companySku")}>
                <span>
                  <strong>{item.platformSkc}</strong>
                  <em>{item.productNameCn}</em>
                </span>
                <StatusTag value="待完善" tone="warning" />
              </button>
            ))}
            {!incompleteSkus.length && <EmptyBlock icon={<Package size={22} />} title="暂无待完善 SKU" text="启用 SKU 的建议字段都已补齐。" />}
          </div>
        </Panel>

        <Panel title="最近维护记录" count={events.length}>
          <div className="event-list">
            {events.slice(0, 10).map((event) => (
              <div className="event-row" key={event.id}>
                <span>{event.action}</span>
                <strong>{event.targetCode}</strong>
                <em>{event.createdAt}</em>
              </div>
            ))}
            {!events.length && <EmptyBlock icon={<Clock3 size={22} />} title="暂无维护记录" text="新增或编辑 SKU 后会显示在这里。" />}
          </div>
        </Panel>
      </section>

      <section className="shortcut-grid">
        <button onClick={onCreateCompanySku}>
          <Package size={18} />
          新增公司 SKU
        </button>
        <button onClick={onCreateMapping}>
          <Tag size={18} />
          新增平台 SKU 映射
        </button>
        <button onClick={() => onJump("platformMappings")}>
          <RefreshCw size={18} />
          查看映射表
        </button>
      </section>
    </div>
  );
}
