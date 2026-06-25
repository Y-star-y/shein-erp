"use client";

import {
  AppSelect,
  EmptyTableRow,
  PageHeader,
  StatusTag,
  includesQuery,
  statusOptions,
  statusText,
  useErpStore,
  type CompanySku,
  type CompanySkuStatus,
  type PlatformSkuMapping,
} from "@shein-erp/shared";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { type CSSProperties, useMemo } from "react";
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
          [item.platformSkc, item.productNameCn, item.specification, item.color, item.model, item.supplierUrl],
          companyQuery,
        )
      );
    });
  }, [companyQuery, companySkus, companyStatusFilter]);

  const tableStyle = { "--table-min-width": "1320px" } as CSSProperties;

  return (
    <div className="page-stack">
      <PageHeader
        action={
          <button className="primary-btn" onClick={onCreate}>
            <Plus size={16} />
            新增公司 SKU
          </button>
        }
        description="只展示第一版核心字段，报关、物流、采购等扩展信息后续再接入。"
        title="公司 SKU"
      />

      <section className="table-panel">
        <div className="table-toolbar">
          <label className="table-search">
            <Search size={15} />
            <input placeholder="搜索公司 SKU、产品名、规格或供应商" value={companyQuery} onChange={(event) => setCompanyQuery(event.target.value)} />
          </label>
          <AppSelect
            onChange={setCompanyStatusFilter}
            options={[{ label: "全部状态", value: "all" }, ...statusOptions]}
            value={companyStatusFilter}
            width={128}
          />
          <span className="count-pill">{filteredCompanySkus.length}/{companySkus.length}</span>
        </div>
        <div className="table-scroll">
          <table className="data-table" style={tableStyle}>
            <thead>
              <tr>
                {["公司SKU", "产品中文名", "规格", "颜色", "型号", "图片", "供应商", "预警线", "映射数", "来源", "状态", "更新时间", "操作"].map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCompanySkus.length ? (
                filteredCompanySkus.map((item) => (
                  <CompanySkuRow
                    item={item}
                    key={item.id}
                    mappings={mappings}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onStatusChange={onStatusChange}
                  />
                ))
              ) : (
                <EmptyTableRow colSpan={13} title="暂无公司 SKU" text="点击右上角新增公司 SKU。" />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CompanySkuRow({
  item,
  mappings,
  onDelete,
  onEdit,
  onStatusChange,
}: {
  item: CompanySku;
  mappings: PlatformSkuMapping[];
  onDelete: (item: CompanySku) => void;
  onEdit: (item: CompanySku) => void;
  onStatusChange: (item: CompanySku, status: CompanySkuStatus) => void;
}) {
  const mappingCount = countMappingsForSku(item.platformSkc, mappings);

  return (
    <tr>
      <td title={item.platformSkc}><strong>{item.platformSkc}</strong></td>
      <td title={item.productNameCn}>{item.productNameCn}</td>
      <td title={item.specification}>{item.specification || "-"}</td>
      <td>{item.color || "-"}</td>
      <td>{item.model || "-"}</td>
      <td title={item.imageUrl}>{item.imageUrl ? "已填写" : "-"}</td>
      <td title={item.supplierUrl}>{item.supplierUrl || "-"}</td>
      <td>{item.defaultWarningQuantity || "-"}</td>
      <td>{mappingCount}</td>
      <td>manual</td>
      <td><StatusTag value={statusText(item.status)} tone={item.status === "active" ? "success" : "neutral"} /></td>
      <td>{item.updatedAt}</td>
      <td>
        <div className="row-actions">
          <button className="icon-text-btn edit" onClick={() => onEdit(item)}><Pencil size={14} />编辑</button>
          <button className="icon-text-btn" onClick={() => onStatusChange(item, item.status === "active" ? "inactive" : "active")}>
            {item.status === "active" ? "停用" : "启用"}
          </button>
          <button className="icon-text-btn danger" onClick={() => onDelete(item)}><Trash2 size={14} />删除</button>
        </div>
      </td>
    </tr>
  );
}
