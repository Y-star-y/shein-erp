"use client";

import { EmptyBlock, includesQuery, PageHeader, readJsonResponse, type OrderImportResult } from "@shein-erp/shared";
import { Alert, Button, Input, Upload } from "antd";
import { ClipboardList, Upload as UploadIcon } from "lucide-react";
import { useState } from "react";

function importResultDescription(result: OrderImportResult) {
  if (result.unmapped === 0) {
    return "所有订单行均已匹配已有 SKU 映射。";
  }

  if (result.newSellerSkus.length > 0) {
    return `待绑定卖家 SKU：${result.newSellerSkus.slice(0, 5).join("、")}${result.newSellerSkus.length > 5 ? "…" : ""}`;
  }

  return `有 ${result.unmapped} 行待绑定，将按卖家 SKU / 平台 SKU 展示在待绑定列表。`;
}

export function ImportTab({
  onImported,
  storeId,
  storeName,
  compact = false,
}: {
  onImported?: () => void;
  storeId?: string;
  storeName?: string;
  compact?: boolean;
}) {
  const [storeNameInput, setStoreNameInput] = useState(storeName ?? "");
  const lockedStore = Boolean(storeId);
  const effectiveStoreName = lockedStore ? storeName ?? "" : storeNameInput;
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<OrderImportResult | null>(null);
  const [error, setError] = useState("");

  async function handleUpload(file: File) {
    if (!lockedStore && !effectiveStoreName.trim()) {
      setError("请填写默认店铺名称（Excel 无店铺列时使用）");
      return false;
    }

    setUploading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    if (storeId) {
      formData.append("storeId", storeId);
    } else {
      formData.append("storeName", effectiveStoreName.trim());
    }

    try {
      const response = await fetch("/api/orders/import", {
        method: "POST",
        body: formData,
      });
      const body = await readJsonResponse<OrderImportResult & { error?: string }>(response);
      if (!response.ok) {
        throw new Error(body?.error || `导入失败 (${response.status})`);
      }
      if (!body) {
        throw new Error("服务器返回空响应，请重启 dev 服务后重试（pnpm db:generate）");
      }
      setResult(body);
      onImported?.();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "导入失败");
    } finally {
      setUploading(false);
    }

    return false;
  }

  const content = (
    <section className="table-panel">
      <div className="table-toolbar" style={{ flexDirection: "column", alignItems: "stretch", gap: 16 }}>
        {lockedStore ? (
          <Alert
            showIcon
            type="info"
            title={`导入至店铺：${effectiveStoreName || storeId}`}
            description="本 Excel 内所有订单均归属此店铺，忽略表格中的店铺列。"
          />
        ) : (
          <Input
            placeholder="默认店铺名称（必填，Excel 无店铺列时使用）"
            status={error && !effectiveStoreName.trim() ? "error" : undefined}
            value={storeNameInput}
            onChange={(event) => setStoreNameInput(event.target.value)}
          />
        )}
        <Upload accept=".xlsx,.xls" beforeUpload={handleUpload} maxCount={1} showUploadList={false}>
          <Button icon={<UploadIcon size={16} />} loading={uploading} type="primary">
            选择 Excel 并导入
          </Button>
        </Upload>
        {error ? <Alert showIcon type="error" title={error} /> : null}
        {result ? (
          <Alert
            showIcon
            type="info"
            title={`导入完成：共 ${result.total} 行，已映射 ${result.mapped} 行，待绑定 ${result.unmapped} 行`}
            description={importResultDescription(result)}
          />
        ) : (
          <EmptyBlock
            icon={<ClipboardList size={22} />}
            text="匹配键为卖家 SKU（自定义）或平台 SKU，均为全局唯一。平台 SKC 仅作款式/颜色参考。"
            title="尚未导入订单"
          />
        )}
      </div>
    </section>
  );

  if (compact) {
    return content;
  }

  return (
    <div className="page-stack">
      <PageHeader
        action={<span />}
        description="上传 SHEIN 订单 Excel，系统按卖家 SKU / 平台 SKU 自动匹配已有映射；未匹配的商品会进入「待绑定商品」页。"
        title="SHEIN 订单导入"
      />
      {content}
    </div>
  );
}
