"use client";

import {
  AppSelect,
  EmptyBlock,
  PageHeader,
  StatusTag,
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
import { countMappingsForSku } from "./model";

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
      return (
        statusMatched &&
        includesQuery(
          [item.internalSku, item.productGroupName, item.productNameCn, item.specification, item.color, item.size, item.model, item.supplierUrl],
          companyQuery,
        )
      );
    });
  }, [companyQuery, companySkus, companyStatusFilter]);

  const columns = useMemo(
    () => [
      {
        title: "内部商品编码",
        dataIndex: "internalSku",
        render: (value: string) => <strong title={value}>{value}</strong>,
      },
      { title: "商品组/款式", dataIndex: "productGroupName", render: (value: string) => <span title={value}>{value || "-"}</span> },
      { title: "商品名称", dataIndex: "productNameCn", render: (value: string) => <span title={value}>{value}</span> },
      { title: "规格", dataIndex: "specification", render: (value: string) => <span title={value}>{value || "-"}</span> },
      { title: "颜色", dataIndex: "color", render: (value: string) => value || "-" },
      { title: "尺码", dataIndex: "size", render: (value: string) => value || "-" },
      { title: "型号", dataIndex: "model", render: (value: string) => value || "-" },
      { title: "供应商", dataIndex: "supplierUrl", render: (value: string) => <span title={value}>{value || "-"}</span> },
      { title: "预警", dataIndex: "defaultWarningQuantity", render: (value: string) => value || "-" },
      {
        title: "SKC映射数",
        key: "mappingCount",
        render: (_: unknown, item: CompanySku) => countMappingsForSku(item.internalSku, mappings),
      },
      {
        title: "状态",
        dataIndex: "status",
        render: (value: CompanySkuStatus) => <StatusTag value={statusText(value)} tone={statusTone(value)} />,
      },
      { title: "更新时间", dataIndex: "updatedAt" },
      {
        title: "操作",
        key: "actions",
        fixed: "right" as const,
        width: 210,
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
        description="内部商品是真实可发货的商品，SHEIN SKC 按店铺映射到这里。库存、采购、借货都以内部商品为准。"
        title="内部商品"
      />

      <section className="table-panel">
        <div className="table-toolbar">
          <Input
            className="table-search"
            prefix={<Search size={15} />}
            placeholder="搜索内部商品编码、款式、商品名、尺码、颜色、供应商"
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
          locale={{ emptyText: <EmptyBlock icon={<Package size={22} />} title="暂无内部商品" text="先新增内部商品，再绑定各店铺返回的 SHEIN SKC。" /> }}
          pagination={false}
          rowKey="id"
          scroll={{ x: 1480 }}
          size="middle"
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
