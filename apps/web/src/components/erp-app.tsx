"use client";

import {
  CompanySkuForm,
  CompanySkuPage,
  isSkuIncomplete,
  normalizeCompanySku,
  useCompanySkuActions,
} from "@shein-erp/company-sku";
import { OpsConsolePage } from "@shein-erp/ops-console";
import {
  MappingForm,
  PlatformMappingPage,
  normalizeMapping,
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
import { Button, ConfigProvider, Input, Layout, Menu, theme } from "antd";
import { Layers3, Package, Plus, Search, Tag } from "lucide-react";
import { useMemo } from "react";

const menuSections = [
  {
    title: "运营工作台",
    items: [{ key: "dashboard" as PageKey, title: "首页", icon: Layers3 }],
  },
  {
    title: "商品资料",
    items: [
      { key: "companySku" as PageKey, title: "内部商品", icon: Package },
      { key: "platformMappings" as PageKey, title: "SHEIN映射", icon: Tag },
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
    () => menuSections.flatMap((section) => section.items).find((item) => item.key === page)?.title || "首页",
    [page],
  );

  const menuItems = menuSections.map((section) => ({
    key: section.title,
    label: section.title,
    type: "group" as const,
    children: section.items.map((item) => ({
      key: item.key,
      icon: <item.icon size={17} />,
      label: item.title,
    })),
  }));

  return (
    <Layout className="erp-shell">
      <Layout.Sider className="erp-sidebar" width={212} breakpoint="lg" collapsedWidth={72}>
        <div className="brand-card">
          <div className="brand-logo">ERP</div>
          <div>
            <strong>冰域 ERP</strong>
            <span>商品映射基础资料</span>
          </div>
        </div>
        <Menu
          className="menu-sections"
          items={menuItems}
          mode="inline"
          selectedKeys={[page]}
          onClick={({ key }) => setPage(key as PageKey)}
        />
      </Layout.Sider>

      <Layout className="erp-main">
        <Layout.Header className="erp-topbar">
          <div>
            <p>第一阶段</p>
            <h1>{activeTitle}</h1>
          </div>
          {page !== "dashboard" && (
            <div className="topbar-actions">
              <Input
                className="search-shell"
                prefix={<Search size={16} />}
                placeholder={page === "platformMappings" ? "搜索 SHEIN SKC、店铺、内部商品编码" : "搜索内部商品编码、商品名、供应商"}
                value={page === "platformMappings" ? mappingQuery : companyQuery}
                onChange={(event) => (page === "platformMappings" ? setMappingQuery(event.target.value) : setCompanyQuery(event.target.value))}
              />
              <Button
                icon={<Plus size={16} />}
                type="primary"
                onClick={() => (page === "platformMappings" ? mappingActions.openMappingModal("create") : companyActions.openCompanyModal("create"))}
              >
                {page === "platformMappings" ? "新增映射" : "新增内部商品"}
              </Button>
            </div>
          )}
        </Layout.Header>

        <Layout.Content className="erp-workspace">
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
        </Layout.Content>
      </Layout>

      {modal?.type === "company" && (
        <AppModal title={modal.mode === "create" ? "新增内部商品" : "编辑内部商品"} onClose={() => setModal(null)}>
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
        <AppModal title={modal.mode === "create" ? "新增 SHEIN SKC 映射" : "编辑 SHEIN SKC 映射"} onClose={() => setModal(null)}>
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
    </Layout>
  );
}

export function ErpApp() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          borderRadius: 8,
          colorPrimary: "#165dff",
          fontFamily:
            'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif',
        },
      }}
    >
      <ErpProvider
        isSkuIncomplete={isSkuIncomplete}
        normalizeCompanySku={normalizeCompanySku}
        normalizeMapping={normalizeMapping}
      >
        <ErpShell />
      </ErpProvider>
    </ConfigProvider>
  );
}
