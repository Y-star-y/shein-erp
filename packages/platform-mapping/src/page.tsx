"use client";

import { resolveCompanySkuState } from "@shein-erp/company-sku";
import {
  AppSelect,
  EmptyTableRow,
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

  const tableStyle = { "--table-min-width": "1580px" } as CSSProperties;

  return (
    <div className="page-stack">
      <PageHeader
        action={
          <button className="primary-btn" onClick={onCreate}>
            <Plus size={16} />
            新增映射
          </button>
        }
        description="把每个店铺从 SHEIN 返回的 SKC 绑定到 ERP 内部商品。库存、采购、借货按内部商品走，订单导入按 SHEIN SKC 匹配。"
        title="SHEIN SKC 映射"
      />

      <section className="table-panel">
        <div className="table-toolbar">
          <label className="table-search">
            <Search size={15} />
            <input
              placeholder="搜索店铺、SHEIN SKC、内部商品编码、卖家SKU、SPU、商品名"
              value={mappingQuery}
              onChange={(event) => setMappingQuery(event.target.value)}
            />
          </label>
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
          <span className="count-pill">{filteredMappings.length}/{mappings.length}</span>
        </div>
        <div className="table-scroll">
          <table className="data-table" style={tableStyle}>
            <thead>
              <tr>
                {["平台", "店铺", "SHEIN SKC", "内部商品编码", "商品状态", "商品ID", "SPU", "平台SKU", "卖家SKU", "SHEIN商品名", "映射状态", "更新时间", "操作"].map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMappings.length ? (
                filteredMappings.map((item) => {
                  const skuState = resolveCompanySkuState(item.internalSku, companySkus);
                  return (
                    <tr key={item.id}>
                      <td>{platformText(item.platform)}</td>
                      <td title={item.storeName}>{item.storeName}</td>
                      <td title={item.platformSkc}><strong>{item.platformSkc}</strong></td>
                      <td title={item.internalSku}>{item.internalSku || "-"}</td>
                      <td><StatusTag value={skuState.label} tone={skuState.tone} /></td>
                      <td title={item.sheinProductId}>{item.sheinProductId || "-"}</td>
                      <td title={item.platformSpu}>{item.platformSpu || "-"}</td>
                      <td title={item.platformSku}>{item.platformSku || "-"}</td>
                      <td title={item.sellerSku}>{item.sellerSku || "-"}</td>
                      <td title={item.sheinProductName}>{item.sheinProductName || "-"}</td>
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
                })
              ) : (
                <EmptyTableRow colSpan={13} title="暂无 SHEIN 映射" text="店铺获得 SHEIN SKC 后，在这里绑定到内部商品。" />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
