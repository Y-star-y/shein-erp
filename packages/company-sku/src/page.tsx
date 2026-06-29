"use client";

import {
  AppSelect,
  EmptyBlock,
  PageHeader,
  StatusTag,
  getProductDisplayName,
  includesQuery,
  statusOptions,
  statusText,
  statusTone,
  useErpStore,
  type CompanySku,
  type CompanySkuStatus,
} from "@shein-erp/shared";
import { Button, Input, Space, Table, Tag } from "antd";
import { Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { companySkuSearchText, countMappingsForSku } from "./model";

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
    mappings,
    companyQuery,
    setCompanyQuery,
    companyStatusFilter,
    setCompanyStatusFilter,
  } = useErpStore();

  const filteredCompanySkus = useMemo(() => {
    return companySkus.filter((item) => {
      const statusMatched = companyStatusFilter === "all" || item.status === companyStatusFilter;
      if (!statusMatched) return false;
      return includesQuery([companySkuSearchText(item)], companyQuery);
    });
  }, [companyQuery, companySkus, companyStatusFilter]);

  const columns = useMemo(
    () => [
      {
        title: "内部商品编码",
        dataIndex: "internalSku",
        width: 220,
        ellipsis: true,
        render: (value: string) => <strong>{value}</strong>,
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
        render: (_: unknown, item: CompanySku) => countMappingsForSku(item.internalSku, mappings),
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
    [mappings, onDelete, onEdit, onStatusChange],
  );

  return (
    <div className="page-stack">
      <PageHeader
        action={
          <Button icon={<Plus size={16} />} type="primary" onClick={onCreate}>
            新增内部商品
          </Button>
        }
        description="内部商品是真实可发货的商品。各店铺订单通过平台 SKU / 卖家 SKU 映射到这里，库存、采购、借货都以内部商品为准。"
        title="内部商品"
      />

      <section className="table-panel">
        <div className="table-toolbar">
          <Input
            className="table-search"
            prefix={<Search size={15} />}
            placeholder="搜索内部商品编码、公司名称、产品名称"
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
          columns={columns}
          dataSource={filteredCompanySkus}
          locale={{ emptyText: <EmptyBlock icon={<Package size={22} />} title="暂无内部商品" text="先新增内部商品，再按平台 SKU 绑定各店铺订单。" /> }}
          pagination={false}
          rowKey="id"
          scroll={{ x: 980 }}
          size="middle"
          tableLayout="fixed"
        />
      </section>
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
    <Space size={6}>
      <Button icon={<Pencil size={14} />} size="small" type="link" onClick={() => onEdit(item)}>编辑</Button>
      <Button size="small" type="link" onClick={() => onStatusChange(item, item.status === "active" ? "inactive" : "active")}>
        {item.status === "active" ? "停用" : "启用"}
      </Button>
      <Button danger icon={<Trash2 size={14} />} size="small" type="link" onClick={() => onDelete(item)}>删除</Button>
    </Space>
  );
}
