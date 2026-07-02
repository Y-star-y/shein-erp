"use client";

import { readJsonResponse } from "@/lib/api-response";
import {
  EmptyBlock,
  StatusTag,
  includesQuery,
  statusText,
  statusTone,
  type PlatformSkuMapping,
  type StoreRecord,
  type UnmappedOrderLine,
  type UnmappedSkcGroup,
} from "@shein-erp/shared";
import { Button, Input, Segmented, Table, Tag, Alert, message } from "antd";
import { Link2, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { InternalProductPreviewModal } from "./internal-product-preview-modal";

type BindView = "unmapped" | "mapped";

function groupUnmappedByPlatformSku(lines: UnmappedOrderLine[]): UnmappedSkcGroup[] {
  const groups = new Map<string, UnmappedSkcGroup>();

  for (const line of lines) {
    const platformSku = line.platformSku.trim();
    if (!platformSku) continue;

    const existing = groups.get(platformSku);
    if (existing) {
      existing.orderCount += 1;
      continue;
    }

    groups.set(platformSku, {
      groupKey: line.groupKey,
      platformSkc: line.platformSkc,
      sellerSku: line.sellerSku,
      platformSku,
      platformSpu: line.platformSpu,
      sheinProductName: line.sheinProductName,
      spec: line.spec,
      articleNo: line.articleNo,
      storeName: line.storeName,
      orderCount: 1,
      sampleOrderNo: line.sampleOrderNo,
    });
  }

  return [...groups.values()].sort((left, right) => right.orderCount - left.orderCount);
}

export function StoreProductBindTab({
  store,
  onBind,
  reloadKey = 0,
}: {
  store: StoreRecord;
  onBind?: (group: UnmappedSkcGroup) => void;
  reloadKey?: number;
}) {
  const [view, setView] = useState<BindView>("unmapped");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [unmappedGroups, setUnmappedGroups] = useState<UnmappedSkcGroup[]>([]);
  const [mappings, setMappings] = useState<PlatformSkuMapping[]>([]);
  const [previewInternalProductId, setPreviewInternalProductId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [unmappedResponse, mappingsResponse] = await Promise.all([
        fetch(`/api/orders/unmapped?storeId=${store.id}`),
        fetch(`/api/stores/${store.id}/mappings`),
      ]);
      const unmappedData = await readJsonResponse<UnmappedOrderLine[] & { error?: string }>(
        unmappedResponse,
      );
      const mappingsData = await readJsonResponse<{ mappings?: PlatformSkuMapping[]; error?: string }>(
        mappingsResponse,
      );

      if (!unmappedResponse.ok) {
        throw new Error(
          typeof unmappedData === "object" && unmappedData && "error" in unmappedData
            ? String(unmappedData.error)
            : "加载待绑定数据失败",
        );
      }
      if (!mappingsResponse.ok) throw new Error(mappingsData?.error ?? "加载映射失败");

      const unmappedLines = Array.isArray(unmappedData) ? unmappedData : [];
      setUnmappedGroups(groupUnmappedByPlatformSku(unmappedLines));
      setMappings(mappingsData?.mappings ?? []);
    } catch (error) {
      setUnmappedGroups([]);
      setMappings([]);
      message.error(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [store.id]);

  useEffect(() => {
    void loadData();
  }, [loadData, reloadKey]);

  const filteredUnmapped = useMemo(() => {
    return unmappedGroups.filter((item) =>
      includesQuery(
        [item.platformSku, item.platformSkc, item.sheinProductName, item.spec, item.articleNo],
        query,
      ),
    );
  }, [query, unmappedGroups]);

  const filteredMappings = useMemo(() => {
    return mappings.filter((item) =>
      includesQuery(
        [
          item.platformSku,
          item.platformSkc,
          item.internalProductId,
          item.sheinProductName,
          item.platformSpu,
          item.remark,
        ],
        query,
      ),
    );
  }, [mappings, query]);

  const handleBindGroup = useCallback(
    (group: UnmappedSkcGroup) => {
      if (!onBind) {
        message.warning("当前账号无权绑定产品");
        return;
      }
      onBind(group);
    },
    [onBind],
  );

  const openManualBind = useCallback(() => {
    handleBindGroup({
      groupKey: "",
      platformSkc: "",
      sellerSku: "",
      platformSku: "",
      platformSpu: "",
      sheinProductName: "",
      spec: "",
      articleNo: "",
      storeName: store.name,
      orderCount: 0,
      sampleOrderNo: "",
    });
  }, [handleBindGroup, store.name]);

  const unmappedColumns = useMemo(
    () => [
      {
        title: "平台 SKU",
        dataIndex: "platformSku",
        width: 180,
        render: (value: string) => <strong>{value}</strong>,
      },
      {
        title: "SHEIN 商品名",
        dataIndex: "sheinProductName",
        ellipsis: true,
        render: (value: string) => value || "—",
      },
      {
        title: "规格 / 货号",
        key: "spec",
        width: 160,
        ellipsis: true,
        render: (_value: unknown, record: UnmappedSkcGroup) =>
          [record.spec, record.articleNo].filter(Boolean).join(" / ") || "—",
      },
      {
        title: "涉及订单",
        dataIndex: "orderCount",
        width: 96,
        render: (value: number) => `${value} 单`,
      },
      {
        title: "操作",
        key: "actions",
        width: 96,
        fixed: "right" as const,
        render: (_value: unknown, record: UnmappedSkcGroup) => (
          <Button
            disabled={!onBind}
            icon={<Link2 size={14} />}
            size="small"
            type="link"
            onClick={() => handleBindGroup(record)}
          >
            绑定
          </Button>
        ),
      },
    ],
    [handleBindGroup, onBind],
  );

  const mappedColumns = useMemo(
    () => [
      {
        title: "平台 SKU",
        dataIndex: "platformSku",
        width: 180,
        render: (value: string) => <strong>{value || "—"}</strong>,
      },
      {
        title: "内部商品 ID",
        dataIndex: "internalProductId",
        width: 220,
        render: (value: string) =>
          value ? (
            <Button size="small" type="link" onClick={() => setPreviewInternalProductId(value)}>
              {value}
            </Button>
          ) : (
            "—"
          ),
      },
      {
        title: "SHEIN 商品名",
        dataIndex: "sheinProductName",
        ellipsis: true,
        render: (value: string) => value || "—",
      },
      {
        title: "平台 SKC",
        dataIndex: "platformSkc",
        width: 140,
        ellipsis: true,
        render: (value: string) => value || "—",
      },
      {
        title: "状态",
        dataIndex: "status",
        width: 96,
        render: (value: PlatformSkuMapping["status"]) => (
          <StatusTag value={statusText(value)} tone={statusTone(value)} />
        ),
      },
      {
        title: "更新时间",
        dataIndex: "updatedAt",
        width: 168,
      },
    ],
    [],
  );

  return (
    <div className="store-product-bind-tab page-stack">
      <Alert
        showIcon
        type="info"
        title="绑定按平台 SKU 计"
        description="「已绑定」列表统计的是不同平台 SKU 的映射条数。若同一平台 SKU 出现在多笔订单中，订单里会显示多件商品，但此处仍只有一条映射。"
        style={{ marginBottom: 0 }}
      />
      <section className="table-panel">
        <div className="table-toolbar" style={{ marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
          <Input
            allowClear
            className="table-search"
            placeholder="搜索平台 SKU、商品名、内部商品 ID"
            prefix={<Search size={15} />}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Segmented
            options={[
              {
                value: "unmapped",
                label: (
                  <span className="order-filter-segment">
                    待绑定
                    {unmappedGroups.length > 0 ? (
                      <span className="order-filter-dot" aria-hidden />
                    ) : null}
                  </span>
                ),
              },
              { value: "mapped", label: "已绑定" },
            ]}
            value={view}
            onChange={(value) => setView(value as BindView)}
          />
          <Button
            disabled={!onBind}
            icon={<Plus size={15} />}
            type="primary"
            onClick={openManualBind}
          >
            新增绑定
          </Button>
          <Tag className="count-pill">
            {view === "unmapped"
              ? `${filteredUnmapped.length}/${unmappedGroups.length}`
              : `${filteredMappings.length}/${mappings.length}`}
          </Tag>
        </div>

        {view === "unmapped" ? (
          <Table
            className="store-product-bind-table"
            columns={unmappedColumns}
            dataSource={filteredUnmapped}
            loading={loading}
            locale={{
              emptyText: (
                <EmptyBlock
                  icon={<Link2 size={22} />}
                  title="暂无待绑定平台 SKU"
                  text="导入订单后，未匹配的平台 SKU 会出现在此处，可绑定到内部商品。"
                />
              ),
            }}
            pagination={{ pageSize: 20, showSizeChanger: true }}
            rowKey="platformSku"
            scroll={{ x: 920 }}
            size="middle"
          />
        ) : (
          <Table
            className="store-product-bind-table"
            columns={mappedColumns}
            dataSource={filteredMappings}
            loading={loading}
            locale={{
              emptyText: (
                <EmptyBlock
                  icon={<Link2 size={22} />}
                  title="暂无已绑定映射"
                  text="将平台 SKU 绑定到内部商品后，映射关系会显示在此处。"
                />
              ),
            }}
            pagination={{ pageSize: 20, showSizeChanger: true }}
            rowKey="id"
            scroll={{ x: 980 }}
            size="middle"
          />
        )}
      </section>

      <InternalProductPreviewModal
        internalProductId={previewInternalProductId}
        open={Boolean(previewInternalProductId)}
        onClose={() => setPreviewInternalProductId(null)}
      />
    </div>
  );
}
