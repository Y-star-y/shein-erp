"use client";

import { resolveCompanySkuState } from "@shein-erp/company-sku";
import {
  AppSelect,
  EmptyBlock,
  PageHeader,
  StatusTag,
  includesQuery,
  mappingStatusOptions,
  platformOptions,
  platformText,
  statusText,
  statusTone,
  useErpStore,
  type PlatformSkuMapping,
  type PlatformSkuMappingStatus,
} from "@shein-erp/shared";
import { Button, Input, Space, Table, Tag } from "antd";
import { Pencil, Plus, Search, Tag as TagIcon, Trash2 } from "lucide-react";
import { useMemo } from "react";

export function PlatformMappingPage({
  onCreate,
  onDelete,
  onEdit,
  onStatusChange,
}: {
  onCreate: () => void;
  onDelete: (item: PlatformSkuMapping) => void;
  onEdit: (item: PlatformSkuMapping) => void;
  onStatusChange: (item: PlatformSkuMapping, status: PlatformSkuMappingStatus) => void;
}) {
  const {
    companySkus,
    mappings,
    mappingQuery,
    setMappingQuery,
    mappingPlatformFilter,
    setMappingPlatformFilter,
    mappingStatusFilter,
    setMappingStatusFilter,
  } = useErpStore();

  const filteredMappings = useMemo(() => {
    return mappings.filter((item) => {
      const platformMatched = mappingPlatformFilter === "all" || item.platform === mappingPlatformFilter;
      const statusMatched = mappingStatusFilter === "all" || item.status === mappingStatusFilter;
      return (
        platformMatched &&
        statusMatched &&
        includesQuery(
          [
            item.platform,
            item.storeName,
            item.internalSku,
            item.platformSkc,
            item.platformSku,
            item.sellerSku,
            item.sheinProductId,
            item.platformSpu,
            item.sheinProductName,
            item.remark,
          ],
          mappingQuery,
        )
      );
    });
  }, [mappingPlatformFilter, mappingQuery, mappingStatusFilter, mappings]);

  const columns = useMemo(
    () => [
      { title: "平台", dataIndex: "platform", render: (value: string) => platformText(value) },
      { title: "店铺", dataIndex: "storeName", render: (value: string) => <span title={value}>{value}</span> },
      {
        title: "平台 SKU",
        dataIndex: "platformSku",
        render: (value: string) => <strong title={value}>{value || "—"}</strong>,
      },
      { title: "卖家 SKU", dataIndex: "sellerSku", render: (value: string) => <span title={value}>{value || "—"}</span> },
      { title: "内部商品编码", dataIndex: "internalSku", render: (value: string) => <span title={value}>{value || "—"}</span> },
      {
        title: "商品状态",
        key: "skuState",
        render: (_: unknown, item: PlatformSkuMapping) => {
          const skuState = resolveCompanySkuState(item.internalSku, companySkus);
          return <StatusTag value={skuState.label} tone={skuState.tone} />;
        },
      },
      { title: "平台 SKC（参考）", dataIndex: "platformSkc", render: (value: string) => <span title={value}>{value || "—"}</span> },
      { title: "商品 ID", dataIndex: "sheinProductId", render: (value: string) => <span title={value}>{value || "—"}</span> },
      { title: "SPU", dataIndex: "platformSpu", render: (value: string) => <span title={value}>{value || "—"}</span> },
      { title: "SHEIN 商品名", dataIndex: "sheinProductName", render: (value: string) => <span title={value}>{value || "—"}</span> },
      {
        title: "映射状态",
        dataIndex: "status",
        render: (value: PlatformSkuMappingStatus) => <StatusTag value={statusText(value)} tone={statusTone(value)} />,
      },
      { title: "更新时间", dataIndex: "updatedAt" },
      {
        title: "操作",
        key: "actions",
        fixed: "right" as const,
        width: 210,
        render: (_: unknown, item: PlatformSkuMapping) => (
          <Space size={6}>
            <Button icon={<Pencil size={14} />} size="small" type="link" onClick={() => onEdit(item)}>编辑</Button>
            <Button size="small" type="link" onClick={() => onStatusChange(item, item.status === "active" ? "inactive" : "active")}>
              {item.status === "active" ? "停用" : "启用"}
            </Button>
            <Button danger icon={<Trash2 size={14} />} size="small" type="link" onClick={() => onDelete(item)}>删除</Button>
          </Space>
        ),
      },
    ],
    [companySkus, onDelete, onEdit, onStatusChange],
  );

  return (
    <div className="page-stack">
      <PageHeader
        action={
          <Button icon={<Plus size={16} />} type="primary" onClick={onCreate}>
            新增映射
          </Button>
        }
        description="将 SHEIN 平台 SKU 绑定到 ERP 内部商品。匹配与映射以平台 SKU / 卖家 SKU 为唯一键；平台 SKC 不唯一，仅作款式/颜色参考。"
        title="平台 SKU 映射"
      />

      <section className="table-panel">
        <div className="table-toolbar">
          <Input
            className="table-search"
            prefix={<Search size={15} />}
            placeholder="搜索店铺、平台 SKU、卖家 SKU、内部商品编码、SPU、商品名"
            value={mappingQuery}
            onChange={(event) => setMappingQuery(event.target.value)}
          />
          <AppSelect
            onChange={setMappingPlatformFilter}
            options={[{ label: "全部平台", value: "all" }, ...platformOptions]}
            value={mappingPlatformFilter}
            width={140}
          />
          <AppSelect
            onChange={setMappingStatusFilter}
            options={[{ label: "全部状态", value: "all" }, ...mappingStatusOptions]}
            value={mappingStatusFilter}
            width={160}
          />
          <Tag className="count-pill">{filteredMappings.length}/{mappings.length}</Tag>
        </div>
        <Table
          columns={columns}
          dataSource={filteredMappings}
          locale={{ emptyText: <EmptyBlock icon={<TagIcon size={22} />} title="暂无平台 SKU 映射" text="订单导入后未匹配的平台 SKU 可在「产品绑定」中绑定到内部商品。" /> }}
          pagination={false}
          rowKey="id"
          scroll={{ x: 1580 }}
          size="middle"
        />
      </section>
    </div>
  );
}
