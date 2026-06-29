"use client";

import { readJsonResponse, type OrderImportResult } from "@shein-erp/shared";
import { Alert, Button, Upload } from "antd";
import { Upload as UploadIcon } from "lucide-react";
import { useState } from "react";

function importResultDescription(result: OrderImportResult) {
  if (result.unmapped === 0) {
    return "所有订单行均已匹配已有 SKU 映射。";
  }

  if (result.newSellerSkus.length > 0) {
    return `待绑定卖家 SKU：${result.newSellerSkus.slice(0, 5).join("、")}${result.newSellerSkus.length > 5 ? "…" : ""}`;
  }

  return `有 ${result.unmapped} 行待绑定，请在订单管理中筛选「待绑定」并展开订单处理。`;
}

export function OrderImportButton({
  onImported,
  storeId,
}: {
  onImported?: () => void;
  storeId: string;
  storeName?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<OrderImportResult | null>(null);
  const [error, setError] = useState("");

  async function handleUpload(file: File) {
    setUploading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("storeId", storeId);

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

  return (
    <div className="order-import-action">
      <Upload accept=".xlsx,.xls" beforeUpload={handleUpload} maxCount={1} showUploadList={false}>
        <Button icon={<UploadIcon size={16} />} loading={uploading} type="primary">
          导入订单
        </Button>
      </Upload>
      {error ? (
        <Alert showIcon style={{ marginTop: 12 }} type="error" title={error} />
      ) : null}
      {result ? (
        <Alert
          showIcon
          style={{ marginTop: 12 }}
          type="success"
          title={`导入完成：共 ${result.total} 行，已映射 ${result.mapped} 行，待绑定 ${result.unmapped} 行`}
          description={importResultDescription(result)}
        />
      ) : null}
    </div>
  );
}
