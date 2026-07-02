"use client";

import {
  AppSelect,
  CopyableCodeText,
  EmptyBlock,
  PageHeader,
  StatusTag,
  getProductDisplayName,
  statusOptions,
  statusText,
  statusTone,
  useErpStore,
  type CompanySku,
  type CompanySkuStatus,
} from "@shein-erp/shared";
import { Button, Input, Space, Table, Tag } from "antd";
import { ChevronDown, ChevronRight, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductMappingStoresModal } from "./mapping-stores-modal";
import { matchesCompanySkuSearch } from "./model";
import { ProductParamsPanel } from "./product-params-panel";

export function CompanySkuPage({
  onCreate,
  onDelete,
  onEdit,
  onStatusChange,
}: {
  onCreate: () => void;
  onDelete: (item: CompanySku) => void;
  onEdit: (item: CompanySku) => void;
  onStatusChange: (item: CompanySku, status: CompanySkuStatus) => void;
}) {
  const {
    companySkus,
    companyQuery,
    setCompanyQuery,
    companyStatusFilter,
    setCompanyStatusFilter,
  } = useErpStore();

  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [mappingCounts, setMappingCounts] = useState<Record<string, number>>({});
  const [mappingModalProduct, setMappingModalProduct] = useState<CompanySku | null>(null);

  const loadMappingCounts = useCallback(() => {
    fetch("/api/internal-products/mapping-counts")
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as {
          counts?: Record<string, number>;
        };
        if (!response.ok) return;
        setMappingCounts(body.counts ?? {});
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    loadMappingCounts();
  }, [companySkus, loadMappingCounts]);

  const filteredCompanySkus = useMemo(() => {
    return companySkus.filter((item) => {
      const statusMatched = companyStatusFilter === "all" || item.status === companyStatusFilter;
      if (!statusMatched) return false;
      return matchesCompanySkuSearch(item, companyQuery);
    });
  }, [companyQuery, companySkus, companyStatusFilter]);

  const columns = useMemo(
    () => [
      {
        title: "内部商品 ID",
        dataIndex: "id",
        width: 220,
        ellipsis: true,
        render: (value: string, item: CompanySku) => (
          <span className="product-row-title">
            {expandedRowKeys.includes(item.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <CopyableCodeText stopPropagation value={value} />
          </span>
        ),
      },
      {
        title: "公司名称",
        dataIndex: "companyName",
        width: 140,
        ellipsis: true,
        render: (value: string) => value || "-",
      },
      {
        title: "产品名称",
        key: "productName",
        width: 180,
        ellipsis: true,
        render: (_: unknown, item: CompanySku) => getProductDisplayName(item),
      },
      {
        title: "映射数",
        key: "mappingCount",
        width: 90,
        className: "table-cell-interactive",
        render: (_: unknown, item: CompanySku) => {
          const count = mappingCounts[item.id] ?? 0;
          return (
            <button
              className="mapping-count-link"
              title="查看店铺映射"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setMappingModalProduct(item);
              }}
            >
              {count}
            </button>
          );
        },
      },
      {
        title: "状态",
        dataIndex: "status",
        width: 80,
        render: (value: CompanySkuStatus) => <StatusTag value={statusText(value)} tone={statusTone(value)} />,
      },
      {
        title: "操作",
        key: "actions",
        fixed: "right" as const,
        width: 210,
        className: "table-cell-interactive",
        render: (_: unknown, item: CompanySku) => (
          <CompanySkuActions item={item} onDelete={onDelete} onEdit={onEdit} onStatusChange={onStatusChange} />
        ),
      },
    ],
    [expandedRowKeys, mappingCounts, onDelete, onEdit, onStatusChange],
  );

  return (
    <div className="page-stack">
      <PageHeader
        action={
          <Button icon={<Plus size={16} />} type="primary" onClick={onCreate}>
            新增内部商品
          </Button>
        }
        description="内部商品是真实可发货的商品。各店铺订单通过平台 SKU 映射到这里。"
        title="内部商品"
      />

      <section className="table-panel">
        <div className="table-toolbar">
          <Input
            className="table-search"
            prefix={<Search size={15} />}
            placeholder="搜索关键词，或多字段 尺码:S, 颜色:红（冒号、逗号均支持中英文）"
            value={companyQuery}
            onChange={(event) => setCompanyQuery(event.target.value)}
          />
          <AppSelect
            onChange={setCompanyStatusFilter}
            options={[{ label: "全部状态", value: "all" }, ...statusOptions]}
            value={companyStatusFilter}
            width={140}
          />
          <Tag className="count-pill">{filteredCompanySkus.length}/{companySkus.length}</Tag>
        </div>
        <Table
          className="company-sku-table"
          columns={columns}
          dataSource={filteredCompanySkus}
          expandable={{
            expandedRowKeys,
            expandIcon: () => null,
            expandIconColumnIndex: -1,
            expandedRowRender: (record) => <ProductParamsPanel item={record} />,
          }}
          locale={{ emptyText: <EmptyBlock icon={<Package size={22} />} title="暂无内部商品" text="先新增内部商品，再按平台 SKU 绑定各店铺订单。点击商品行可展开查看参数。" /> }}
          onRow={(record) => ({
            className: expandedRowKeys.includes(record.id) ? "company-sku-row is-expanded" : "company-sku-row",
            onClick: () => {
              setExpandedRowKeys((keys) =>
                keys.includes(record.id) ? keys.filter((key) => key !== record.id) : [...keys, record.id],
              );
            },
          })}
          pagination={false}
          rowKey="id"
          scroll={{ x: 980 }}
          size="middle"
          tableLayout="fixed"
        />
      </section>
      {mappingModalProduct ? (
        <ProductMappingStoresModal
          product={mappingModalProduct}
          onClose={() => setMappingModalProduct(null)}
          onMappingChanged={loadMappingCounts}
        />
      ) : null}
    </div>
  );
}

function CompanySkuActions({
  item,
  onDelete,
  onEdit,
  onStatusChange,
}: {
  item: CompanySku;
  onDelete: (item: CompanySku) => void;
  onEdit: (item: CompanySku) => void;
  onStatusChange: (item: CompanySku, status: CompanySkuStatus) => void;
}) {
  return (
    <Space size={6} onClick={(event) => event.stopPropagation()}>
      <Button icon={<Pencil size={14} />} size="small" type="link" onClick={() => onEdit(item)}>
        编辑
      </Button>
      <Button
        size="small"
        type="link"
        onClick={() => onStatusChange(item, item.status === "active" ? "inactive" : "active")}
      >
        {item.status === "active" ? "停用" : "启用"}
      </Button>
      <Button danger icon={<Trash2 size={14} />} size="small" type="link" onClick={() => onDelete(item)}>
        删除
      </Button>
    </Space>
  );
}
