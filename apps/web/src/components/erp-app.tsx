"use client";

import { NotificationBell } from "@/components/notification-bell";
import { useNotifications } from "@/hooks/use-notifications";
import { CompanyManagementPage } from "@/components/admin/company-management-page";
import { WarehouseAdminPage } from "@/components/admin/warehouse-admin-page";
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
import { OpsTodoPage } from "@/components/admin/ops-todo-page";
import { normalizeMapping } from "@shein-erp/platform-mapping";
import { BindForm, useOrderBindingActions } from "@shein-erp/order-binding";
import type { OpsTodoTaskId, PageKey, SelectOption, StoreOpenTarget } from "@shein-erp/shared";
import { AppModal, ConfirmModal, ErpProvider, ToastHost, useErpStore } from "@shein-erp/shared";
import { readJsonResponse } from "@/lib/api-response";
import type { AppModule } from "@prisma/client";
import { Button, Input, Layout, Menu, Spin, Tag } from "antd";
import {
  Building2,
  ClipboardList,
  LogOut,
  Package,
  Plus,
  Search,
  Store,
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
      { key: "orderManagement" as PageKey, title: "待办任务", icon: ClipboardList },
    ],
  },
  {
    title: "物流部",
    items: [{ key: "warehouseManagement" as PageKey, title: "仓库管理", icon: Warehouse }],
  },
  {
    title: "系统管理",
    items: [
      { key: "userManagement" as PageKey, title: "员工管理", icon: UserCog },
      { key: "companyManagement" as PageKey, title: "公司管理", icon: Building2 },
      { key: "warehouseAdmin" as PageKey, title: "仓库管理", icon: Warehouse },
    ],
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
  } = useErpStore();

  const companyActions = useCompanySkuActions();
  const [unmappedReloadKey, setUnmappedReloadKey] = useState(0);
  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0);
  const [opsTodoTaskId, setOpsTodoTaskId] = useState<OpsTodoTaskId | null>(null);
  const [storeOpenTarget, setStoreOpenTarget] = useState<StoreOpenTarget | null>(null);
  const { summary: notifications } = useNotifications(notificationRefreshKey + unmappedReloadKey);

  const bumpNotifications = useCallback(() => {
    setNotificationRefreshKey((value) => value + 1);
  }, []);

  const orderBindingActions = useOrderBindingActions(() => {
    setUnmappedReloadKey((value) => value + 1);
    bumpNotifications();
  });

  type NavigateOptions = {
    taskId?: OpsTodoTaskId;
    storeTarget?: StoreOpenTarget;
  };

  const navigateTo = useCallback(
    (nextPage: PageKey, options?: string | NavigateOptions) => {
      if (session?.user && !canAccessModule(session.user, nextPage)) {
        setPage(firstAccessiblePage(permissions));
        return;
      }
      const opts = typeof options === "string" ? {} : (options ?? {});
      if (nextPage === "orderManagement" && opts.taskId) {
        setOpsTodoTaskId(opts.taskId);
      }
      if (nextPage === "storeManagement" && opts.storeTarget) {
        setStoreOpenTarget(opts.storeTarget);
        setOpsTodoTaskId(null);
      }
      setPage(nextPage);
    },
    [permissions, session?.user, setPage],
  );

  const openStoreFromTodo = useCallback(
    (target: StoreOpenTarget) => {
      navigateTo("storeManagement", { storeTarget: target });
    },
    [navigateTo],
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

  const isAdmin = session?.user?.role === "ADMIN";
  const [companySelectOptions, setCompanySelectOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      setCompanySelectOptions([]);
      return;
    }

    void fetch("/api/companies")
      .then(async (response) => {
        const data = await readJsonResponse<{ companies?: { name: string; active: boolean }[] }>(response);
        if (!response.ok || !data?.companies) return;
        setCompanySelectOptions(
          data.companies
            .filter((company) => company.active)
            .map((company) => ({ label: company.name, value: company.name })),
        );
      })
      .catch(() => setCompanySelectOptions([]));
  }, [isAdmin]);

  const productCompanyOptions = useMemo<SelectOption[]>(
    () => companySelectOptions,
    [companySelectOptions],
  );

  const openCreateCompanyModal = useCallback(() => {
    companyActions.openCompanyModal("create", undefined, {
      allowCompanyEdit: isAdmin,
      allowEmployeeAccountEdit: isAdmin,
      companyName: session?.user?.companyName,
    });
  }, [companyActions, isAdmin, session?.user?.companyName]);

  const openCreateProductFromBind = useCallback(() => {
    if (modal?.type !== "orderBind") return;
    companyActions.openCompanyModal("create", undefined, {
      allowCompanyEdit: isAdmin,
      allowEmployeeAccountEdit: isAdmin,
      companyName: session?.user?.companyName,
      productName: modal.value.sheinProductName,
      spec: modal.value.spec,
      articleNo: modal.value.articleNo,
      resume: { type: "orderBind", value: modal.value },
    });
  }, [companyActions, isAdmin, modal, session?.user?.companyName]);

  const closeModal = useCallback(() => {
    if (modal?.type === "company" && modal.resume?.type === "orderBind") {
      setModal({
        type: "orderBind",
        value: modal.resume.value,
        errors: {},
      });
      return;
    }
    setModal(null);
  }, [modal, setModal]);

  const openBindModal = useCallback(
    (group: Parameters<typeof orderBindingActions.openBindModal>[0]) => {
      orderBindingActions.openBindModal(group);
    },
    [orderBindingActions],
  );

  const showProductToolbar = page === "productManagement";

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
                  placeholder="搜索关键词，或多字段 尺码:S, 颜色:红（冒号、逗号均支持中英文）"
                  value={companyQuery}
                  onChange={(event) => setCompanyQuery(event.target.value)}
                />
                <Button icon={<Plus size={16} />} type="primary" onClick={openCreateCompanyModal}>
                  新增商品
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
              onCreate={openCreateCompanyModal}
              onDelete={companyActions.requestCompanyDelete}
              onEdit={(item) => companyActions.openCompanyModal("edit", item)}
              onStatusChange={companyActions.requestCompanyStatusChange}
            />
          )}
          {page === "storeManagement" && session?.user && canAccessModule(session.user, "storeManagement") && (
            <StoreManagementPage
              bindReloadKey={unmappedReloadKey}
              openTarget={storeOpenTarget}
              onBind={canAccessModule(session.user, "orderManagement") ? openBindModal : undefined}
              onConsumeOpenTarget={() => setStoreOpenTarget(null)}
              onImported={() => {
                setUnmappedReloadKey((value) => value + 1);
                bumpNotifications();
              }}
            />
          )}
          {page === "inventoryManagement" && session?.user && canAccessModule(session.user, "inventoryManagement") && (
            <InventoryManagementPage />
          )}
          {page === "orderManagement" && session?.user && canAccessModule(session.user, "orderManagement") && (
            <OpsTodoPage
              initialTaskId={opsTodoTaskId}
              unmappedReloadKey={unmappedReloadKey}
              onConsumeInitialTask={() => setOpsTodoTaskId(null)}
              onOpenStore={openStoreFromTodo}
            />
          )}
          {page === "warehouseManagement" && session?.user && canAccessModule(session.user, "warehouseManagement") && (
            <WarehouseManagementPage />
          )}
          {page === "companyManagement" && session?.user && canAccessModule(session.user, "companyManagement") && (
            <CompanyManagementPage />
          )}
          {page === "warehouseAdmin" && session?.user && canAccessModule(session.user, "warehouseAdmin") && (
            <WarehouseAdminPage />
          )}
          {page === "userManagement" && session?.user && canAccessModule(session.user, "userManagement") && (
            <UserManagementPage />
          )}
          {page === "profile" && session?.user && <ProfilePage />}
        </Layout.Content>
      </Layout>

      {modal?.type === "company" && (
        <AppModal title={modal.mode === "create" ? "新增内部商品" : "编辑内部商品"} onClose={closeModal}>
          <CompanySkuForm
            allowCompanyEdit={isAdmin}
            allowEmployeeAccountEdit={isAdmin}
            companyOptions={productCompanyOptions}
            errors={modal.errors}
            mode={modal.mode}
            onChange={(value) => setModal({ ...modal, value, errors: { ...modal.errors, form: "" } })}
            onSubmit={companyActions.saveCompanySku}
            value={modal.value}
          />
        </AppModal>
      )}
      {modal?.type === "orderBind" && (
        <AppModal title="绑定平台 SKU 到内部商品" onClose={closeModal}>
          <BindForm
            activeCompanySkus={activeCompanySkus}
            errors={modal.errors}
            onChange={orderBindingActions.updateBindValue}
            onCreateProduct={openCreateProductFromBind}
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
