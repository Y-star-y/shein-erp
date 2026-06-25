"use client";

import {
  AppSelect,
  EmptyTableRow,
  PageHeader,
  StatusTag,
  includesQuery,
  statusOptions,
  statusText,
  statusTone,
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
          [item.internalSku, item.productGroupName, item.productNameCn, item.specification, item.color, item.size, item.model, item.supplierUrl],
          companyQuery,
        )
      );
    });
  }, [companyQuery, companySkus, companyStatusFilter]);

  const tableStyle = { "--table-min-width": "1480px" } as CSSProperties;

  return (
    <div className="page-stack">
      <PageHeader
        action={
          <button className="primary-btn" onClick={onCreate}>
            <Plus size={16} />
            新增内部商品
          </button>
        }
        description="内部商品是真实可发货的商品，SHEIN SKC 按店铺映射到这里。库存、采购、借货都以内部商品为准。"
        title="内部商品"
      />

      <section className="table-panel">
        <div className="table-toolbar">
          <label className="table-search">
            <Search size={15} />
            <input
              placeholder="搜索内部商品编码、款式、商品名、尺码、颜色、供应商"
              value={companyQuery}
              onChange={(event) => setCompanyQuery(event.target.value)}
            />
          </label>
          <AppSelect
            onChange={setCompanyStatusFilter}
            options={[{ label: "全部状态", value: "all" }, ...statusOptions]}
            value={companyStatusFilter}
            width={140}
          />
          <span className="count-pill">{filteredCompanySkus.length}/{companySkus.length}</span>
        </div>
        <div className="table-scroll">
          <table className="data-table" style={tableStyle}>
            <thead>
              <tr>
                {["内部商品编码", "商品组/款式", "商品名称", "规格", "颜色", "尺码", "型号", "供应商", "预警", "SKC映射数", "状态", "更新时间", "操作"].map((column) => (
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
                <EmptyTableRow colSpan={13} title="暂无内部商品" text="先新增内部商品，再绑定各店铺返回的 SHEIN SKC。" />
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
  const mappingCount = countMappingsForSku(item.internalSku, mappings);

  return (
    <tr>
      <td title={item.internalSku}><strong>{item.internalSku}</strong></td>
      <td title={item.productGroupName}>{item.productGroupName || "-"}</td>
      <td title={item.productNameCn}>{item.productNameCn}</td>
      <td title={item.specification}>{item.specification || "-"}</td>
      <td>{item.color || "-"}</td>
      <td>{item.size || "-"}</td>
      <td>{item.model || "-"}</td>
      <td title={item.supplierUrl}>{item.supplierUrl || "-"}</td>
      <td>{item.defaultWarningQuantity || "-"}</td>
      <td>{mappingCount}</td>
      <td><StatusTag value={statusText(item.status)} tone={statusTone(item.status)} /></td>
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
