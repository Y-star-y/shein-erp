"use client";

import { readJsonResponse } from "@/lib/api-response";
import { AppModal, useErpStore } from "@shein-erp/shared";
import type { StoreDetailTab, StoreOpenTarget, StoreRecord, UnmappedOrderLine } from "@shein-erp/shared";
import { Button, Form, Input, Select, Space, Switch } from "antd";
import { ArrowLeft, Plus, Store } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StoreDeactivateModal } from "./store-deactivate-modal";
import { StoreDetailPanel } from "./store-detail-panel";
import { StoreListPanel } from "./store-list-panel";
import type { StoreFormValues } from "./types";

function resolveStoreDetailTabFromTarget(
  target?: StoreOpenTarget | null,
): StoreDetailTab {
  if (target?.ordersFilter === "unmapped" || target?.tab === "binding") {
    return "binding";
  }
  const tab = target?.tab;
  if (!tab || tab === "shipping" || tab === "inventory") return "orders";
  if (tab === "aftersales") return "exceptions";
  return tab;
}

export function StoreManagementPage({
  onBind,
  onImported,
  openTarget,
  onConsumeOpenTarget,
  bindReloadKey = 0,
}: {
  onBind?: (line: UnmappedOrderLine) => void;
  onImported?: () => void;
  openTarget?: StoreOpenTarget | null;
  onConsumeOpenTarget?: () => void;
  bindReloadKey?: number;
}) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const { pushToast } = useErpStore();
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState<null | { error?: string }>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<string | null>(null);
  const [deactivatePickerOpen, setDeactivatePickerOpen] = useState(false);
  const [deactivatePasswordOpen, setDeactivatePasswordOpen] = useState(false);
  const [unmappedCounts, setUnmappedCounts] = useState<Record<string, number>>({});
  const [pendingShipCounts, setPendingShipCounts] = useState<Record<string, number>>({});
  const [detailTab, setDetailTab] = useState<StoreDetailTab>("orders");
  const [form] = Form.useForm<StoreFormValues>();

  const loadUnmappedCounts = useCallback(async () => {
    try {
      const response = await fetch("/api/orders/unmapped/counts");
      const data = await readJsonResponse<{ counts?: Record<string, number> }>(response);
      if (response.ok) {
        setUnmappedCounts(data?.counts ?? {});
      }
    } catch {
      setUnmappedCounts({});
    }
  }, []);

  const loadPendingShipCounts = useCallback(async () => {
    try {
      const response = await fetch("/api/orders/pending/counts");
      const data = await readJsonResponse<{ stores?: { storeId: string; count: number }[] }>(response);
      if (response.ok) {
        const counts: Record<string, number> = {};
        for (const row of data?.stores ?? []) {
          counts[row.storeId] = row.count;
        }
        setPendingShipCounts(counts);
      }
    } catch {
      setPendingShipCounts({});
    }
  }, []);

  const loadStores = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stores");
      const data = await readJsonResponse<{ stores?: StoreRecord[]; error?: string }>(response);
      if (!response.ok) throw new Error(data?.error ?? "加载店铺失败");
      setStores(data?.stores ?? []);
      void loadUnmappedCounts();
      void loadPendingShipCounts();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "加载店铺失败");
    } finally {
      setLoading(false);
    }
  }, [loadPendingShipCounts, loadUnmappedCounts, pushToast]);

  useEffect(() => {
    void loadStores();
  }, [loadStores]);

  useEffect(() => {
    if (!openTarget?.storeId || loading) return;
    const store = stores.find((item) => item.id === openTarget.storeId);
    if (!store) return;
    setSelectedStoreId(store.id);
    setView("detail");
    setDetailTab(resolveStoreDetailTabFromTarget(openTarget));
    onConsumeOpenTarget?.();
  }, [openTarget, loading, onConsumeOpenTarget, stores]);

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId) ?? null,
    [stores, selectedStoreId],
  );

  const activeStores = useMemo(() => stores.filter((store) => store.active), [stores]);

  function handleImported() {
    void loadUnmappedCounts();
    void loadPendingShipCounts();
    onImported?.();
  }

  function openStore(store: StoreRecord) {
    setSelectedStoreId(store.id);
    setDetailTab("orders");
    setView("detail");
  }

  function backToList() {
    setView("list");
  }

  function closeDeactivateFlow() {
    setDeactivateTarget(null);
    setDeactivatePickerOpen(false);
    setDeactivatePasswordOpen(false);
  }

  function openDeactivatePassword(storeId: string) {
    setDeactivateTarget(storeId);
    setDeactivatePickerOpen(false);
    setDeactivatePasswordOpen(true);
  }

  async function saveStore(values: StoreFormValues) {
    const response = await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await readJsonResponse<StoreRecord & { error?: string }>(response);
    if (!response.ok) {
      setCreateModal({ error: data?.error ?? "保存失败" });
      return;
    }
    pushToast("success", "店铺已注册");
    setCreateModal(null);
    form.resetFields();
    await loadStores();
    if (data?.id) {
      openStore(data as StoreRecord);
    }
  }

  async function handleDeactivateSuccess() {
    const storeId = deactivateTarget;
    pushToast("success", "店铺已注销");
    closeDeactivateFlow();
    if (storeId && selectedStoreId === storeId) {
      const response = await fetch("/api/stores");
      const data = await readJsonResponse<{ stores?: StoreRecord[] }>(response);
      const updated = data?.stores?.find((store) => store.id === storeId);
      if (updated) {
        handleStoreUpdated(updated);
      }
    }
    await loadStores();
  }

  function handleStoreUpdated(updated: StoreRecord) {
    setStores((current) => current.map((store) => (store.id === updated.id ? { ...store, ...updated } : store)));
  }

  function handleStoreDeleted() {
    setSelectedStoreId(null);
    setView("list");
    void loadStores();
  }

  const deactivateStoreName = stores.find((s) => s.id === deactivateTarget)?.name ?? "";

  return (
    <div className="page-stack store-management-page">
      <header className="store-page-header">
        {view === "detail" && selectedStore ? (
          <>
            <div className="store-page-header__main store-page-header__main--detail">
              <button className="store-page-header__back" type="button" onClick={backToList}>
                <ArrowLeft aria-hidden size={16} />
                <span>返回店铺列表</span>
              </button>
              <div className="store-page-header__detail-body">
                <h2 className="store-page-header__title">{selectedStore.name}</h2>
                <p className="store-page-header__desc">查看该店铺的订单、库存与售后异常信息</p>
              </div>
            </div>
            <Space wrap>
              {selectedStore.active ? (
                <Button danger onClick={() => openDeactivatePassword(selectedStore.id)}>
                  注销店铺
                </Button>
              ) : null}
            </Space>
          </>
        ) : (
          <>
            <div className="store-page-header__main">
              <span className="store-page-header__eyebrow">
                <Store size={14} /> 运营部
              </span>
              <h2 className="store-page-header__title">店铺管理</h2>
              <p className="store-page-header__desc">
                {isAdmin ? "管理全部员工的店铺" : "管理您的店铺"}，点击下方店铺查看订单与异常信息
              </p>
            </div>
            <Space wrap>
              <Button
                icon={<Plus size={16} />}
                type="primary"
                onClick={() => {
                  form.resetFields();
                  setCreateModal({});
                }}
              >
                注册店铺
              </Button>
              <Button
                disabled={!activeStores.length}
                onClick={() => {
                  if (!activeStores.length) return;
                  if (activeStores.length === 1) {
                    openDeactivatePassword(activeStores[0]!.id);
                    return;
                  }
                  setDeactivateTarget(activeStores[0]!.id);
                  setDeactivatePickerOpen(true);
                }}
              >
                注销店铺
              </Button>
            </Space>
          </>
        )}
      </header>

      {view === "list" ? (
        <StoreListPanel
          isAdmin={isAdmin}
          loading={loading}
          pendingShipCounts={pendingShipCounts}
          stores={stores}
          unmappedCounts={unmappedCounts}
          onOpenStore={openStore}
        />
      ) : selectedStore ? (
        <StoreDetailPanel
          activeTab={detailTab}
          bindReloadKey={bindReloadKey}
          store={selectedStore}
          onBind={onBind}
          onDeleted={handleStoreDeleted}
          onImported={handleImported}
          onTabChange={(tab) => setDetailTab(tab as StoreDetailTab)}
          onUpdated={handleStoreUpdated}
        />
      ) : null}

      {createModal ? (
        <AppModal title="注册店铺" onClose={() => setCreateModal(null)}>
          {createModal.error ? <p className="form-error">{createModal.error}</p> : null}
          <Form
            form={form}
            initialValues={{ name: "", platform: "SHEIN", active: true }}
            layout="vertical"
            onFinish={saveStore}
          >
            <Form.Item label="店铺名称" name="name" rules={[{ required: true, message: "请输入店铺名称" }]}>
              <Input placeholder="如：SHEIN-旗舰店" />
            </Form.Item>
            <Form.Item label="平台" name="platform">
              <Input placeholder="SHEIN" />
            </Form.Item>
            <Form.Item label="启用" name="active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
          <div className="modal-actions" style={{ marginTop: 16 }}>
            <Button onClick={() => setCreateModal(null)}>取消</Button>
            <Button type="primary" onClick={() => form.submit()}>
              注册
            </Button>
          </div>
        </AppModal>
      ) : null}

      {deactivatePickerOpen && deactivateTarget ? (
        <AppModal title="注销店铺" onClose={closeDeactivateFlow}>
          <p style={{ marginBottom: 16 }}>选择要注销的店铺，下一步需验证登录密码：</p>
          <Select
            options={activeStores.map((store) => ({ value: store.id, label: store.name }))}
            style={{ width: "100%" }}
            value={deactivateTarget}
            onChange={setDeactivateTarget}
          />
          <div className="modal-actions" style={{ marginTop: 16 }}>
            <Button onClick={closeDeactivateFlow}>取消</Button>
            <Button danger type="primary" onClick={() => openDeactivatePassword(deactivateTarget)}>
              下一步
            </Button>
          </div>
        </AppModal>
      ) : null}

      <StoreDeactivateModal
        open={deactivatePasswordOpen && Boolean(deactivateTarget)}
        storeId={deactivateTarget ?? ""}
        storeName={deactivateStoreName}
        onClose={closeDeactivateFlow}
        onSuccess={() => void handleDeactivateSuccess()}
      />
    </div>
  );
}
