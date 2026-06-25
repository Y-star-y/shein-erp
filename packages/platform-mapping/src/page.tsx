"use client";

import { resolveCompanySkuState } from "@shein-erp/company-sku";
import {
  AppSelect,
  EmptyTableRow,
  PageHeader,
  StatusTag,
  includesQuery,
  platformOptions,
  platformText,
  statusOptions,
  statusText,
  useErpStore,
  type PlatformSkuMapping,
  type PlatformSkuMappingStatus,
} from "@shein-erp/shared";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { type CSSProperties, useMemo } from "react";

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
          [item.platform, item.platformSku, item.platformSkc, item.sellerSku, item.sheinProductId, item.platformSpu, item.sheinProductName, item.remark],
          mappingQuery,
        )
      );
    });
  }, [mappingPlatformFilter, mappingQuery, mappingStatusFilter, mappings]);

  const tableStyle = { "--table-min-width": "1260px" } as CSSProperties;

  return (
    <div className="page-stack">
      <PageHeader
        action={
          <button className="primary-btn" onClick={onCreate}>
            <Plus size={16} />
            新增映射
          </button>
        }
        description="维护 SHEIN 平台 SKU、seller SKU、商品 ID 和公司 SKU 的绑定关系。"
        title="平台 SKU 映射"
      />

      <section className="table-panel">
        <div className="table-toolbar">
          <label className="table-search">
            <Search size={15} />
            <input placeholder="搜索平台 SKU、公司 SKU、seller SKU 或商品名" value={mappingQuery} onChange={(event) => setMappingQuery(event.target.value)} />
          </label>
          <AppSelect
            onChange={setMappingPlatformFilter}
            options={[{ label: "全部平台", value: "all" }, ...platformOptions]}
            value={mappingPlatformFilter}
            width={128}
          />
          <AppSelect
            onChange={setMappingStatusFilter}
            options={[{ label: "全部状态", value: "all" }, ...statusOptions]}
            value={mappingStatusFilter}
            width={128}
          />
          <span className="count-pill">{filteredMappings.length}/{mappings.length}</span>
        </div>
        <div className="table-scroll">
          <table className="data-table" style={tableStyle}>
            <thead>
              <tr>
                {["平台", "平台SKU", "公司SKU", "SKU状态", "SHEIN商品ID", "平台SPU", "seller SKU", "平台商品名", "映射状态", "备注", "更新时间", "操作"].map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMappings.length ? (
                filteredMappings.map((item) => {
                  const skuState = resolveCompanySkuState(item.platformSkc, companySkus);
                  return (
                    <tr key={item.id}>
                      <td>{platformText(item.platform)}</td>
                      <td title={item.platformSku}><strong>{item.platformSku}</strong></td>
                      <td title={item.platformSkc}>{item.platformSkc}</td>
                      <td><StatusTag value={skuState.label} tone={skuState.tone} /></td>
                      <td title={item.sheinProductId}>{item.sheinProductId || "-"}</td>
                      <td title={item.platformSpu}>{item.platformSpu || "-"}</td>
                      <td title={item.sellerSku}>{item.sellerSku || "-"}</td>
                      <td title={item.sheinProductName}>{item.sheinProductName || "-"}</td>
                      <td><StatusTag value={statusText(item.status)} tone={item.status === "active" ? "success" : "neutral"} /></td>
                      <td title={item.remark}>{item.remark || "-"}</td>
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
                })
              ) : (
                <EmptyTableRow colSpan={12} title="暂无平台映射" text="点击右上角新增平台 SKU 映射。" />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
