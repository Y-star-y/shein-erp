"use client";

import {
  CompanySkuForm,
  CompanySkuPage,
  isSkuIncomplete,
  normalizeCompanySku,
  useCompanySkuActions,
} from "@shein-erp/company-sku";
import { normalizeMapping } from "@shein-erp/platform-mapping";
import { OpsConsolePage } from "@shein-erp/ops-console";
import {
  MappingForm,
  PlatformMappingPage,
  usePlatformMappingActions,
} from "@shein-erp/platform-mapping";
import {
  AppModal,
  ConfirmModal,
  ErpProvider,
  ToastHost,
  useErpStore,
  type PageKey,
} from "@shein-erp/shared";
import { ChevronRight, Layers3, Package, Plus, Search, Tag } from "lucide-react";
import { useMemo } from "react";

const menuSections = [
  {
    title: "运营工作台",
    items: [{ key: "dashboard" as PageKey, title: "运营台", icon: Layers3 }],
  },
  {
    title: "SKU 管理",
    items: [
      { key: "companySku" as PageKey, title: "公司SKU", icon: Package },
      { key: "platformMappings" as PageKey, title: "平台映射", icon: Tag },
    ],
  },
];

function ErpShell() {
  const {
    page,
    setPage,
    companySkus,
    activeCompanySkus,
    modal,
    setModal,
    confirm,
    setConfirm,
    toasts,
    companyQuery,
    setCompanyQuery,
    mappingQuery,
    setMappingQuery,
  } = useErpStore();

  const companyActions = useCompanySkuActions();
  const mappingActions = usePlatformMappingActions();

  const activeTitle = useMemo(
    () => menuSections.flatMap((section) => section.items).find((item) => item.key === page)?.title || "运营台",
    [page],
  );

  return (
    <div className="erp-shell">
      <aside className="erp-sidebar">
        <div className="brand-card">
          <div className="brand-logo">冰</div>
          <div>
            <strong>冰域 ERP</strong>
            <span>SKU 基础档案</span>
          </div>
        </div>
        <nav className="menu-sections" aria-label="冰域 ERP 菜单">
          {menuSections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              <div className="menu-list">
                {section.items.map((item) => (
                  <button className={page === item.key ? "active" : ""} key={item.key} onClick={() => setPage(item.key)}>
                    <item.icon size={17} />
                    <span>{item.title}</span>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </nav>
      </aside>

      <main className="erp-main">
        <header className="erp-topbar">
          <div>
            <p>第一阶段</p>
            <h1>{activeTitle}</h1>
          </div>
          {page !== "dashboard" && (
            <div className="topbar-actions">
              <label className="search-shell">
                <Search size={16} />
                <input
                  placeholder={page === "platformMappings" ? "搜索平台 SKU、公司 SKU 或备注" : "搜索公司 SKU、商品名或供应商"}
                  value={page === "platformMappings" ? mappingQuery : companyQuery}
                  onChange={(event) => (page === "platformMappings" ? setMappingQuery(event.target.value) : setCompanyQuery(event.target.value))}
                />
              </label>
              <button
                className="primary-btn"
                onClick={() => (page === "platformMappings" ? mappingActions.openMappingModal("create") : companyActions.openCompanyModal("create"))}
              >
                <Plus size={16} />
                {page === "platformMappings" ? "新增映射" : "新增公司 SKU"}
              </button>
            </div>
          )}
        </header>

        <section className="erp-workspace">
          {page === "dashboard" && (
            <OpsConsolePage
              onCreateCompanySku={() => companyActions.openCompanyModal("create")}
              onCreateMapping={() => mappingActions.openMappingModal("create")}
            />
          )}
          {page === "companySku" && (
            <CompanySkuPage
              onCreate={() => companyActions.openCompanyModal("create")}
              onDelete={companyActions.requestCompanyDelete}
              onEdit={(item) => companyActions.openCompanyModal("edit", item)}
              onStatusChange={companyActions.requestCompanyStatusChange}
            />
          )}
          {page === "platformMappings" && (
            <PlatformMappingPage
              onCreate={() => mappingActions.openMappingModal("create")}
              onDelete={mappingActions.requestMappingDelete}
              onEdit={(item) => mappingActions.openMappingModal("edit", item)}
              onStatusChange={mappingActions.requestMappingStatusChange}
            />
          )}
        </section>
      </main>

      {modal?.type === "company" && (
        <AppModal title={modal.mode === "create" ? "新增公司 SKU" : "编辑公司 SKU"} onClose={() => setModal(null)}>
          <CompanySkuForm
            errors={modal.errors}
            mode={modal.mode}
            onChange={(value) => setModal({ ...modal, value, errors: { ...modal.errors, form: "" } })}
            onSubmit={companyActions.saveCompanySku}
            value={modal.value}
          />
        </AppModal>
      )}
      {modal?.type === "mapping" && (
        <AppModal title={modal.mode === "create" ? "新增平台 SKU 映射" : "编辑平台 SKU 映射"} onClose={() => setModal(null)}>
          <MappingForm
            activeCompanySkus={activeCompanySkus}
            companySkus={companySkus}
            errors={modal.errors}
            mode={modal.mode}
            onChange={(value) => setModal({ ...modal, value, errors: { ...modal.errors, form: "" } })}
            onSubmit={mappingActions.saveMapping}
            value={modal.value}
          />
        </AppModal>
      )}
      <ConfirmModal confirm={confirm} onCancel={() => setConfirm(null)} />
      <ToastHost toasts={toasts} />
    </div>
  );
}

export function ErpApp() {
  return (
    <ErpProvider
      isSkuIncomplete={isSkuIncomplete}
      normalizeCompanySku={normalizeCompanySku}
      normalizeMapping={normalizeMapping}
    >
      <ErpShell />
    </ErpProvider>
  );
}
