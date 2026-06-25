"use client";

import { nowText, useErpStore, type CompanySku, type CompanySkuStatus } from "@shein-erp/shared";
import { useCallback } from "react";
import { createCompanySku, normalizeCompanySku, validateCompanySku } from "./model";

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || "请求失败");
  }

  return response.json() as Promise<T>;
}

export function useCompanySkuActions() {
  const { companySkus, setCompanySkus, setModal, modal, recordEvent, pushToast, setConfirm } = useErpStore();

  const openCompanyModal = useCallback((mode: "create" | "edit", value?: CompanySku) => {
    setModal({ type: "company", mode, value: value ? normalizeCompanySku(value) : createCompanySku(), errors: {} });
  }, [setModal]);

  const saveCompanySku = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modal || modal.type !== "company") return;

    const errors = validateCompanySku(modal.value, companySkus, modal.mode);
    if (Object.keys(errors).length) {
      setModal({ ...modal, errors });
      pushToast("error", "请先修正表单错误");
      return;
    }

    const now = nowText();
    const saved = {
      ...modal.value,
      internalSku: modal.value.internalSku.trim(),
      productGroupName: modal.value.productGroupName.trim(),
      productNameCn: modal.value.productNameCn.trim(),
      specification: modal.value.specification.trim(),
      color: modal.value.color.trim(),
      size: modal.value.size.trim(),
      model: modal.value.model.trim(),
      imageUrl: modal.value.imageUrl.trim(),
      supplierUrl: modal.value.supplierUrl.trim(),
      defaultWarningQuantity: modal.value.defaultWarningQuantity.trim(),
      updatedAt: now,
      createdAt: modal.mode === "create" ? now : modal.value.createdAt,
    };

    requestJson<CompanySku>(
      modal.mode === "create" ? "/api/internal-products" : `/api/internal-products/${saved.id}`,
      {
        method: modal.mode === "create" ? "POST" : "PATCH",
        body: JSON.stringify(saved),
      },
    )
      .then((persisted) => {
        setCompanySkus((current) =>
          modal.mode === "create" ? [persisted, ...current] : current.map((item) => (item.id === persisted.id ? persisted : item)),
        );
        recordEvent(modal.mode === "create" ? "新增内部商品" : "编辑内部商品", "companySku", persisted.internalSku, persisted.productNameCn);
        pushToast("success", modal.mode === "create" ? "内部商品已新增" : "内部商品已保存");
        setModal(null);
      })
      .catch((error: Error) => {
        pushToast("error", error.message);
      });
  }, [companySkus, modal, pushToast, recordEvent, setCompanySkus, setModal]);

  const requestCompanyStatusChange = useCallback((item: CompanySku, status: CompanySkuStatus) => {
    const action = status === "active" ? "启用" : "停用";
    setConfirm({
      title: `${action}内部商品`,
      description: `确认${action}「${item.internalSku}」吗？${status === "inactive" ? "停用后不能再被新 SHEIN 映射选择。" : ""}`,
      confirmText: action,
      tone: status === "inactive" ? "danger" : "primary",
      onConfirm: () => {
        requestJson<CompanySku>(`/api/internal-products/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        })
          .then((persisted) => {
            setCompanySkus((current) => current.map((sku) => (sku.id === item.id ? persisted : sku)));
            recordEvent(`${action}内部商品`, "companySku", item.internalSku, item.productNameCn);
            pushToast("success", `已${action}内部商品`);
            setConfirm(null);
          })
          .catch((error: Error) => pushToast("error", error.message));
      },
    });
  }, [pushToast, recordEvent, setCompanySkus, setConfirm]);

  const requestCompanyDelete = useCallback((item: CompanySku) => {
    setConfirm({
      title: "删除内部商品",
      description: `确认删除「${item.internalSku}」吗？已有 SHEIN 映射会保留，但会显示内部商品不存在。`,
      confirmText: "删除",
      tone: "danger",
      onConfirm: () => {
        fetch(`/api/internal-products/${item.id}`, { method: "DELETE" })
          .then((response) => {
            if (!response.ok) throw new Error("删除失败");
            setCompanySkus((current) => current.filter((sku) => sku.id !== item.id));
            recordEvent("删除内部商品", "companySku", item.internalSku, item.productNameCn);
            pushToast("success", "内部商品已删除");
            setConfirm(null);
          })
          .catch((error: Error) => pushToast("error", error.message));
      },
    });
  }, [pushToast, recordEvent, setCompanySkus, setConfirm]);

  return {
    openCompanyModal,
    saveCompanySku,
    requestCompanyStatusChange,
    requestCompanyDelete,
  };
}
