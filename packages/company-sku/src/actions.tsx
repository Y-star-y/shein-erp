"use client";

import { nowText, useErpStore, type CompanySku, type CompanySkuStatus } from "@shein-erp/shared";
import { useCallback } from "react";
import { createCompanySku, normalizeCompanySku, validateCompanySku } from "./model";

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
      platformSkc: modal.value.platformSkc.trim(),
      productNameCn: modal.value.productNameCn.trim(),
      specification: modal.value.specification.trim(),
      color: modal.value.color.trim(),
      model: modal.value.model.trim(),
      imageUrl: modal.value.imageUrl.trim(),
      supplierUrl: modal.value.supplierUrl.trim(),
      defaultWarningQuantity: modal.value.defaultWarningQuantity.trim(),
      updatedAt: now,
      createdAt: modal.mode === "create" ? now : modal.value.createdAt,
    };

    setCompanySkus((current) => (modal.mode === "create" ? [saved, ...current] : current.map((item) => (item.id === saved.id ? saved : item))));
    recordEvent(modal.mode === "create" ? "新增公司 SKU" : "编辑公司 SKU", "companySku", saved.platformSkc, saved.productNameCn);
    pushToast("success", modal.mode === "create" ? "公司 SKU 已新增" : "公司 SKU 已保存");
    setModal(null);
  }, [companySkus, modal, pushToast, recordEvent, setCompanySkus, setModal]);

  const requestCompanyStatusChange = useCallback((item: CompanySku, status: CompanySkuStatus) => {
    const action = status === "active" ? "启用" : "停用";
    setConfirm({
      title: `${action}公司 SKU`,
      description: `确认${action}「${item.platformSkc}」吗？${status === "inactive" ? "停用后不能被新增平台映射选择。" : ""}`,
      confirmText: action,
      tone: status === "inactive" ? "danger" : "primary",
      onConfirm: () => {
        const now = nowText();
        setCompanySkus((current) => current.map((sku) => (sku.id === item.id ? { ...sku, status, updatedAt: now } : sku)));
        recordEvent(`${action}公司 SKU`, "companySku", item.platformSkc, item.productNameCn);
        pushToast("success", `已${action}公司 SKU`);
        setConfirm(null);
      },
    });
  }, [pushToast, recordEvent, setCompanySkus, setConfirm]);

  const requestCompanyDelete = useCallback((item: CompanySku) => {
    setConfirm({
      title: "删除公司 SKU",
      description: `确认删除「${item.platformSkc}」吗？已有平台映射不会删除，但会显示关联 SKU 不可用。`,
      confirmText: "删除",
      tone: "danger",
      onConfirm: () => {
        setCompanySkus((current) => current.filter((sku) => sku.id !== item.id));
        recordEvent("删除公司 SKU", "companySku", item.platformSkc, item.productNameCn);
        pushToast("success", "公司 SKU 已删除");
        setConfirm(null);
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
