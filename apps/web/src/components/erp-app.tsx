"use client";

import { NotificationBell } from "@/components/notification-bell";
import { useNotifications } from "@/hooks/use-notifications";
import { UserManagementPage } from "@/components/admin/user-management-page";
import { StoreManagementPage } from "@/components/admin/store-management-page";
import { WarehouseManagementPage } from "@/components/admin/warehouse-management-page";
import { InventoryManagementPage } from "@/components/admin/inventory-management-page";
import { ProfilePage } from "@/components/profile/profile-page";
import {
  CompanySkuForm,
  CompanySkuPage,
  isSkuIncomplete,
  normalizeCompanySku,
  useCompanySkuActions,
} from "@shein-erp/company-sku";
import { canAccessModule, firstAccessiblePage } from "@/lib/permissions";
import {
  MappingForm,
  PlatformMappingPage,
  normalizeMapping,
  usePlatformMappingActions,
} from "@shein-erp/platform-mapping";
import {
  BindForm,
  OrderBindingPage,
  useOrderBindingActions,
} from "@shein-erp/order-binding";
import {
  AppModal,
  ConfirmModal,
  ErpProvider,
  ToastHost,
  useErpStore,
  type PageKey,
} from "@shein-erp/shared";
import type { AppModule } from "@prisma/client";
import { Button, Input, Layout, Menu, Spin, Tag } from "antd";
import {
  ClipboardList,
  LogOut,
  Package,
  Plus,
  Search,
  Store,
  Tag as TagIcon,
  User,
  UserCog,
  Warehouse,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";

const roleLabels: Record<string, string> = {
  ADMIN: "管理员",
  OPERATIONS: "运营部",
  LOGISTICS: "物流部",
};

const allMenuSections = [
  {
    title: "运营部",
    items: [
      { key: "productManagement" as PageKey, title: "商品管理", icon: Package },
      { key: "storeManagement" as PageKey, title: "店铺管理", icon: Store },
      { key: "inventoryManagement" as PageKey, title: "库存管理", icon: Warehouse },
      { key: "orderManagement" as PageKey, title: "订单管理", icon: ClipboardList },
      { key: "platformMappings" as PageKey, title: "SHEIN映射", icon: TagIcon },
    ],
  },
  {
    title: "物流部",
    items: [{ key: "warehouseManagement" as PageKey, title: "仓库管理", icon: Warehouse }],
  },
  {
    title: "系统管理",
    items: [{ key: "userManagement" as PageKey, title: "员工管理", icon: UserCog }],
  },
];

function ErpShell() {
  const { data: session, status } = useSession();
  useSessionGuard();
  const permissions = (session?.user?.permissions ?? []) as AppModule[];
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
  const [unmappedReloadKey, setUnmappedReloadKey] = useState(0);
  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0);
  const [orderBindingTab, setOrderBindingTab] = useState("import");
  const { summary: notifications } = useNotifications(notificationRefreshKey + unmappedReloadKey);

  const bumpNotifications = useCallback(() => {
    setNotificationRefreshKey((value) => value + 1);
  }, []);

  const orderBindingActions = useOrderBindingActions(() => {
    setUnmappedReloadKey((value) => value + 1);
    bumpNotifications();
  });

  const navigateTo = useCallback(
    (nextPage: PageKey, tab?: string) => {
      if (session?.user && !canAccessModule(session.user, nextPage)) {
        setPage(firstAccessiblePage(permissions));
        return;
      }
      if (nextPage === "orderManagement" && tab) {
        setOrderBindingTab(tab);
      }
      setPage(nextPage);
    },
    [permissions, session?.user, setPage],
  );

  useEffect(() => {
    if (!session?.user) return;
    if (!canAccessModule(session.user, page)) {
      setPage(firstAccessiblePage(permissions));
    }
  }, [page, permissions, session?.user, setPage]);

  const visibleMenuSections = useMemo(() => {
    if (!session?.user) return [];
    return allMenuSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => canAccessModule(session.user, item.key)),
      }))
      .filter((section) => section.items.length > 0);
  }, [session]);

  const activeTitle = useMemo(() => {
    if (page === "profile") return "个人信息";
    return visibleMenuSections.flatMap((section) => section.items).find((item) => item.key === page)?.title || "ERP";
  }, [page, visibleMenuSections]);

  const hasOrderNotifications = notifications.total > 0;

  const menuItems = visibleMenuSections.map((section) => ({
    key: section.title,
    label: section.title,
    type: "group" as const,
    children: section.items.map((item) => ({
      key: item.key,
      icon: <item.icon size={17} />,
      label:
        item.key === "orderManagement" && hasOrderNotifications ? (
          <span className="menu-item-label">
            {item.title}
            <span className="menu-item-dot" aria-hidden />
          </span>
        ) : (
          item.title
        ),
    })),
  }));

  const showProductToolbar = page === "productManagement";
  const showMappingToolbar = page === "platformMappings";

  if (status === "loading") {
    return (
      <div className="erp-shell-loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout className="erp-shell">
      <Layout.Sider className="erp-sidebar" width={212} breakpoint="lg" collapsedWidth={72}>
        <div className="brand-card">
          <div className="brand-logo">ERP</div>
          <div>
            <strong>冰域 ERP</strong>
            <span>跨境电商运营系统</span>
          </div>
        </div>
        <Menu
          className="menu-sections"
          items={menuItems}
          mode="inline"
          selectedKeys={[page]}
          onClick={({ key }) => navigateTo(key as PageKey)}
        />
      </Layout.Sider>

      <Layout className="erp-main">
        <Layout.Header className="erp-topbar">
          <div>
            <p>权限模块</p>
            <h1>{activeTitle}</h1>
          </div>
          <div className="topbar-actions">
            {showProductToolbar && (
              <>
                <Input
                  className="search-shell"
                  prefix={<Search size={16} />}
                  placeholder="搜索内部商品编码、商品名、供应商"
                  value={companyQuery}
                  onChange={(event) => setCompanyQuery(event.target.value)}
                />
                <Button icon={<Plus size={16} />} type="primary" onClick={() => companyActions.openCompanyModal("create")}>
                  新增商品
                </Button>
              </>
            )}
            {showMappingToolbar && (
              <>
                <Input
                  className="search-shell"
                  prefix={<Search size={16} />}
                  placeholder="搜索 SHEIN SKC、店铺、内部商品编码"
                  value={mappingQuery}
                  onChange={(event) => setMappingQuery(event.target.value)}
                />
                <Button icon={<Plus size={16} />} type="primary" onClick={() => mappingActions.openMappingModal("create")}>
                  新增映射
                </Button>
              </>
            )}
            {session?.user ? (
              <div className="user-menu">
                <NotificationBell summary={notifications} onNavigate={navigateTo} />
                <span className="user-name">{session.user.name}</span>
                <Tag>{roleLabels[session.user.role] ?? session.user.role}</Tag>
                <Button icon={<User size={16} />} onClick={() => setPage("profile")}>
                  个人信息
                </Button>
                <Button
                  icon={<LogOut size={16} />}
                  onClick={async () => {
                    await fetch("/api/auth/logout-audit", { method: "POST" });
                    await signOut({ callbackUrl: "/login" });
                  }}
                >
                  退出登录
                </Button>
              </div>
            ) : null}
          </div>
        </Layout.Header>

        <Layout.Content className="erp-workspace">
          {page === "productManagement" && session?.user && canAccessModule(session.user, "productManagement") && (
            <CompanySkuPage
              onCreate={() => companyActions.openCompanyModal("create")}
              onDelete={companyActions.requestCompanyDelete}
              onEdit={(item) => companyActions.openCompanyModal("edit", item)}
              onStatusChange={companyActions.requestCompanyStatusChange}
            />
          )}
          {page === "storeManagement" && session?.user && canAccessModule(session.user, "storeManagement") && (
            <StoreManagementPage />
          )}
          {page === "inventoryManagement" && session?.user && canAccessModule(session.user, "inventoryManagement") && (
            <InventoryManagementPage />
          )}
          {page === "orderManagement" && session?.user && canAccessModule(session.user, "orderManagement") && (
            <OrderBindingPage
              activeTab={orderBindingTab}
              unmappedCount={notifications.unmappedCount}
              unmappedReloadKey={unmappedReloadKey}
              onBind={orderBindingActions.openBindModal}
              onImported={bumpNotifications}
              onTabChange={setOrderBindingTab}
            />
          )}
          {page === "platformMappings" && session?.user && canAccessModule(session.user, "platformMappings") && (
            <PlatformMappingPage
              onCreate={() => mappingActions.openMappingModal("create")}
              onDelete={mappingActions.requestMappingDelete}
              onEdit={(item) => mappingActions.openMappingModal("edit", item)}
              onStatusChange={mappingActions.requestMappingStatusChange}
            />
          )}
          {page === "warehouseManagement" && session?.user && canAccessModule(session.user, "warehouseManagement") && (
            <WarehouseManagementPage />
          )}
          {page === "userManagement" && session?.user && canAccessModule(session.user, "userManagement") && (
            <UserManagementPage />
          )}
          {page === "profile" && session?.user && <ProfilePage />}
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
      {modal?.type === "orderBind" && (
        <AppModal title="绑定 SHEIN SKC 到内部商品" onClose={() => setModal(null)}>
          <BindForm
            activeCompanySkus={activeCompanySkus}
            errors={modal.errors}
            onChange={orderBindingActions.updateBindValue}
            onSubmit={orderBindingActions.saveBind}
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
    <ErpProvider
      isSkuIncomplete={isSkuIncomplete}
      normalizeCompanySku={normalizeCompanySku}
      normalizeMapping={normalizeMapping}
    >
      <ErpShell />
    </ErpProvider>
  );
}
