"use client";

import { nowText, useErpStore, type PlatformSkuMapping, type PlatformSkuMappingStatus } from "@shein-erp/shared";
import { useCallback } from "react";
import { createPlatformMapping, normalizeMapping, validateMapping } from "./model";

export function usePlatformMappingActions() {
  const { companySkus, mappings, setMappings, setModal, modal, recordEvent, pushToast, setConfirm } = useErpStore();

  const openMappingModal = useCallback((mode: "create" | "edit", value?: PlatformSkuMapping, defaultSkc = "") => {
    setModal({ type: "mapping", mode, value: value ? normalizeMapping(value) : createPlatformMapping(defaultSkc), errors: {} });
  }, [setModal]);

  const saveMapping = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modal || modal.type !== "mapping") return;

    const errors = validateMapping(modal.value, companySkus, mappings, modal.mode);
    if (Object.keys(errors).length) {
      setModal({ ...modal, errors });
      pushToast("error", "请先修正表单错误");
      return;
    }

    const now = nowText();
    const saved = {
      ...modal.value,
      platform: modal.value.platform.trim() || "SHEIN",
      platformSku: modal.value.platformSku.trim(),
      platformSkc: modal.value.platformSkc.trim(),
      sheinProductId: modal.value.sheinProductId.trim(),
      platformSpu: modal.value.platformSpu.trim(),
      sellerSku: modal.value.sellerSku.trim(),
      sheinProductName: modal.value.sheinProductName.trim(),
      remark: modal.value.remark.trim(),
      updatedAt: now,
      createdAt: modal.mode === "create" ? now : modal.value.createdAt,
    };

    setMappings((current) => (modal.mode === "create" ? [saved, ...current] : current.map((item) => (item.id === saved.id ? saved : item))));
    recordEvent(modal.mode === "create" ? "新增平台映射" : "编辑平台映射", "platformMapping", saved.platformSku, `${saved.platform} -> ${saved.platformSkc}`);
    pushToast("success", modal.mode === "create" ? "平台映射已新增" : "平台映射已保存");
    setModal(null);
  }, [companySkus, mappings, modal, pushToast, recordEvent, setMappings, setModal]);

  const requestMappingStatusChange = useCallback((item: PlatformSkuMapping, status: PlatformSkuMappingStatus) => {
    const action = status === "active" ? "启用" : "停用";
    setConfirm({
      title: `${action}平台映射`,
      description: `确认${action}「${item.platform} / ${item.platformSku}」吗？`,
      confirmText: action,
      tone: status === "inactive" ? "danger" : "primary",
      onConfirm: () => {
        const now = nowText();
        setMappings((current) => current.map((mapping) => (mapping.id === item.id ? { ...mapping, status, updatedAt: now } : mapping)));
        recordEvent(`${action}平台映射`, "platformMapping", item.platformSku, `${item.platform} -> ${item.platformSkc}`);
        pushToast("success", `已${action}平台映射`);
        setConfirm(null);
      },
    });
  }, [pushToast, recordEvent, setConfirm, setMappings]);

  const requestMappingDelete = useCallback((item: PlatformSkuMapping) => {
    setConfirm({
      title: "删除平台映射",
      description: `确认删除「${item.platform} / ${item.platformSku}」吗？公司 SKU 主档不会受影响。`,
      confirmText: "删除",
      tone: "danger",
      onConfirm: () => {
        setMappings((current) => current.filter((mapping) => mapping.id !== item.id));
        recordEvent("删除平台映射", "platformMapping", item.platformSku, `${item.platform} -> ${item.platformSkc}`);
        pushToast("success", "平台映射已删除");
        setConfirm(null);
      },
    });
  }, [pushToast, recordEvent, setConfirm, setMappings]);

  return {
    openMappingModal,
    saveMapping,
    requestMappingStatusChange,
    requestMappingDelete,
  };
}
