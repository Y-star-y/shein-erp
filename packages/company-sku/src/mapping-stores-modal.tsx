"use client";

import {
  AppModal,
  AppSelect,
  EmptyBlock,
  StatusTag,
  TextField,
  getProductDisplayName,
  statusText,
  statusTone,
  useErpStore,
  type CompanySku,
  type PlatformSkuMappingStatus,
  type SelectOption,
} from "@shein-erp/shared";
import { Button, Popconfirm, Spin, Table } from "antd";
import { Link2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ProductParamsPanel } from "./product-params-panel";

type InternalProductMappingRow = {
  id: string;
  storeName: string;
  storePlatform: string;
  ownerName?: string;
  ownerEmail?: string;
  platformSku: string | null;
  sellerSku: string | null;
  platformSkc: string | null;
  status: string;
  updatedAt: string;
};

type StoreOptionRecord = {
  id: string;
  name: string;
  platform: string;
  ownerName?: string;
  ownerEmail?: string;
};

const emptyAddForm = {
  storeId: "",
  platformSku: "",
};

export function ProductMappingStoresModal({
  onClose,
  onMappingChanged,
  product,
}: {
  onClose: () => void;
  onMappingChanged?: () => void;
  product: CompanySku | null;
}) {
  const { pushToast, setMappings } = useErpStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<InternalProductMappingRow[]>([]);
  const [stores, setStores] = useState<StoreOptionRecord[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState(emptyAddForm);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const showOwner = rows.some((row) => row.ownerName || row.ownerEmail) || stores.some((store) => store.ownerName);

  const storeById = useMemo(() => new Map(stores.map((store) => [store.id, store])), [stores]);
  const mappedPlatformSkus = useMemo(
    () => new Set(rows.filter((row) => row.status === "active" && row.platformSku).map((row) => row.platformSku!.trim())),
    [rows],
  );

  const storeOptions: SelectOption[] = useMemo(
    () =>
      stores.map((store) => {
        const ownerHint = store.ownerName ? ` · ${store.ownerName}` : "";
        return {
          label: `${store.name}（${store.platform}）${ownerHint}`,
          value: store.id,
          description: store.ownerEmail || store.platform,
        };
      }),
    [stores],
  );

  const loadMappings = useCallback(async () => {
    if (!product) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/internal-products/${product.id}/mappings`);
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        mappings?: InternalProductMappingRow[];
        stores?: StoreOptionRecord[];
      };
      if (!response.ok) {
        throw new Error(body.error || "加载映射失败");
      }
      setRows(body.mappings ?? []);
      setStores(body.stores ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "加载映射失败");
      setRows([]);
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, [product]);

  useEffect(() => {
    void loadMappings();
  }, [loadMappings]);

  const handleAddMapping = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!product) return;

      const storeId = addForm.storeId.trim();
      const platformSku = addForm.platformSku.trim();
      const nextErrors: Record<string, string> = {};
      const selectedStore = storeById.get(storeId);

      if (!storeId) {
        nextErrors.storeId = "请选择店铺";
      } else if (!selectedStore) {
        nextErrors.storeId = "请从列表中选择已有店铺";
      }

      if (!platformSku) {
        nextErrors.platformSku = "请输入平台 SKU";
      } else if (mappedPlatformSkus.has(platformSku)) {
        nextErrors.platformSku = "该平台 SKU 已绑定到此内部商品";
      }

      if (Object.keys(nextErrors).length) {
        setAddErrors(nextErrors);
        return;
      }

      setAddErrors({});
      setAdding(true);

      try {
        const response = await fetch(`/api/internal-products/${product.id}/mappings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeId, platformSku }),
        });
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
          mapping?: InternalProductMappingRow;
          updatedLineCount?: number;
        };

        if (!response.ok) {
          throw new Error(body.error || "新增映射失败");
        }

        if (body.mapping) {
          setRows((current) =>
            [...current, body.mapping!].sort((left, right) =>
              left.storeName.localeCompare(right.storeName, "zh-CN"),
            ),
          );
        } else {
          await loadMappings();
        }

        setAddForm(emptyAddForm);
        onMappingChanged?.();

        const storeName = selectedStore?.name ?? "店铺";
        const lineHint =
          body.updatedLineCount && body.updatedLineCount > 0
            ? `，已自动绑定 ${body.updatedLineCount} 条待绑定订单行`
            : "";
        pushToast("success", `已新增「${storeName}」映射${lineHint}`);
      } catch (addError) {
        pushToast("error", addError instanceof Error ? addError.message : "新增映射失败");
      } finally {
        setAdding(false);
      }
    },
    [addForm, loadMappings, mappedPlatformSkus, onMappingChanged, product, pushToast, storeById],
  );

  const handleUnbind = useCallback(
    async (row: InternalProductMappingRow) => {
      if (!product) return;

      setDeletingId(row.id);
      try {
        const response = await fetch(`/api/internal-products/${product.id}/mappings/${row.id}`, {
          method: "DELETE",
        });
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          throw new Error(body.error || "解绑失败");
        }

        setRows((current) => current.filter((item) => item.id !== row.id));
        setMappings((current) => current.filter((item) => item.id !== row.id));
        onMappingChanged?.();
        pushToast("success", `已解绑「${row.storeName}」映射`);
      } catch (unbindError) {
        pushToast("error", unbindError instanceof Error ? unbindError.message : "解绑失败");
      } finally {
        setDeletingId(null);
      }
    },
    [onMappingChanged, product, pushToast, setMappings],
  );

  const columns = useMemo(() => {
    const base = [
      {
        title: "店铺",
        key: "storeName",
        render: (_: unknown, row: InternalProductMappingRow) => (
          <div className="mapping-store-cell">
            <strong>{row.storeName}</strong>
            <span>{row.storePlatform}</span>
          </div>
        ),
      },
      ...(showOwner
        ? [
            {
              title: "负责人",
              key: "owner",
              render: (_: unknown, row: InternalProductMappingRow) => (
                <div className="mapping-store-cell">
                  <strong>{row.ownerName || "—"}</strong>
                  {row.ownerEmail ? <span>{row.ownerEmail}</span> : null}
                </div>
              ),
            },
          ]
        : []),
      {
        title: "平台 SKU",
        dataIndex: "platformSku",
        render: (value: string | null) => value || "—",
      },
      {
        title: "状态",
        dataIndex: "status",
        width: 88,
        render: (value: string) => (
          <StatusTag tone={statusTone(value as PlatformSkuMappingStatus)} value={statusText(value as PlatformSkuMappingStatus)} />
        ),
      },
      {
        title: "更新时间",
        dataIndex: "updatedAt",
        width: 168,
      },
      {
        title: "操作",
        key: "actions",
        width: 88,
        className: "table-cell-interactive",
        render: (_: unknown, row: InternalProductMappingRow) => (
          <Popconfirm
            cancelText="取消"
            description={`确认解绑「${row.storeName}」的映射吗？相关订单行会恢复为待绑定。`}
            okButtonProps={{ danger: true, loading: deletingId === row.id }}
            okText="解绑"
            title="解绑映射"
            onConfirm={() => void handleUnbind(row)}
          >
            <Button
              danger
              icon={<Trash2 size={14} />}
              loading={deletingId === row.id}
              size="small"
              type="link"
            >
              解绑
            </Button>
          </Popconfirm>
        ),
      },
    ];

    return base;
  }, [deletingId, handleUnbind, showOwner]);

  if (!product) return null;

  const canAddMapping = product.status === "active";

  return (
    <AppModal
      className="app-modal-wide"
      title={`店铺映射 · ${getProductDisplayName(product)}`}
      width="min(96vw, 1280px)"
      onClose={onClose}
    >
      <div className="product-mapping-modal">
        <p className="product-mapping-modal__meta">
          内部商品 ID：<code>{product.id}</code>
        </p>

        <ProductParamsPanel item={product} />

        {canAddMapping ? (
          <form className="product-mapping-modal__add" noValidate onSubmit={(event) => void handleAddMapping(event)}>
            <p className="product-mapping-modal__add-title">新增平台 SKU 映射</p>
            <div className="product-mapping-modal__add-fields">
              <AppSelect
                error={addErrors.storeId}
                label="店铺"
                onChange={(value) => {
                  setAddForm((current) => ({ ...current, storeId: value }));
                  if (addErrors.storeId) {
                    setAddErrors((current) => ({ ...current, storeId: "" }));
                  }
                }}
                options={storeOptions}
                placeholder={stores.length ? "搜索或选择已有店铺" : "暂无可选店铺"}
                required
                showSearch
                value={addForm.storeId}
              />
              <TextField
                error={addErrors.platformSku}
                label="平台 SKU（唯一匹配键）"
                required
                value={addForm.platformSku}
                onChange={(value) => {
                  setAddForm((current) => ({ ...current, platformSku: value }));
                  if (addErrors.platformSku) {
                    setAddErrors((current) => ({ ...current, platformSku: "" }));
                  }
                }}
              />
              <Button htmlType="submit" icon={<Plus size={14} />} loading={adding} type="primary">
                新增映射
              </Button>
            </div>
            <p className="product-mapping-modal__add-hint">
              只能从已有店铺中选择；同一店铺可绑定多个平台 SKU，但平台 SKU 全局唯一。
            </p>
          </form>
        ) : (
          <p className="product-mapping-modal__add-hint product-mapping-modal__add-hint--muted">
            该内部商品已停用，不能新增映射，但仍可解绑已有映射。
          </p>
        )}

        {loading ? (
          <div className="product-mapping-modal__loading">
            <Spin />
          </div>
        ) : error ? (
          <EmptyBlock icon={<Link2 size={22} />} text={error} title="加载失败" />
        ) : (
          <Table
            className="product-mapping-table"
            columns={columns}
            dataSource={rows}
            locale={{
              emptyText: (
                <EmptyBlock
                  icon={<Link2 size={22} />}
                  text="当前可见范围内，还没有店铺映射到这个内部商品。"
                  title="暂无映射"
                />
              ),
            }}
            pagination={false}
            rowKey="id"
            size="middle"
            tableLayout="auto"
          />
        )}
      </div>
    </AppModal>
  );
}
