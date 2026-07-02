"use client";



import { readJsonResponse, type OrderImportResult } from "@shein-erp/shared";

import { Alert, Button, Upload } from "antd";

import { Upload as UploadIcon } from "lucide-react";

import { useState } from "react";



function importSkuCountHint(result: OrderImportResult) {
  const uniqueCount = result.uniquePlatformSkuCount ?? result.total;
  if (uniqueCount >= result.total) return "";
  return `共 ${result.total} 行、${uniqueCount} 个不同平台 SKU。同一平台 SKU 出现在多笔订单时，「绑定产品」只显示 ${uniqueCount} 条映射。`;
}

function importResultTitle(result: OrderImportResult) {
  const uniqueCount = result.uniquePlatformSkuCount ?? result.total;

  if (result.unmapped === 0) {
    if (uniqueCount < result.total) {
      return `导入完成：${result.total} 行均已匹配（${uniqueCount} 个不同平台 SKU）`;
    }
    return `导入完成：共 ${result.total} 行，均已匹配`;
  }

  const skuList = result.unmappedPlatformSkus.join("、");
  if (skuList) {
    return `导入完成：${result.unmapped} 行待绑定 — ${skuList}`;
  }

  return `导入完成：共 ${result.total} 行，待绑定 ${result.unmapped} 行`;
}

function importResultDescription(result: OrderImportResult) {
  const skuHint = importSkuCountHint(result);

  if (result.unmapped === 0) {
    return skuHint || "所有订单行均已匹配已有平台 SKU 映射。";
  }

  const base = `共 ${result.total} 行，已映射 ${result.mapped} 行。请前往「绑定产品」标签页补全映射，或在下方订单列表展开订单查看高亮的平台 SKU。`;
  return skuHint ? `${base} ${skuHint}` : base;
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
          type={result.unmapped > 0 ? "warning" : "success"}
          title={importResultTitle(result)}
          description={importResultDescription(result)}
        />

      ) : null}

    </div>

  );

}


