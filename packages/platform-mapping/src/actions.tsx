"use client";

import { nowText, useErpStore, type PlatformSkuMapping, type PlatformSkuMappingStatus } from "@shein-erp/shared";
import { useCallback } from "react";
import { createPlatformMapping, normalizeMapping, validateMapping } from "./model";

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

export function usePlatformMappingActions() {
  const { companySkus, mappings, setMappings, setModal, modal, pushToast, setConfirm } = useErpStore();

  const openMappingModal = useCallback((mode: "create" | "edit", value?: PlatformSkuMapping, defaultInternalSku = "") => {
    setModal({ type: "mapping", mode, value: value ? normalizeMapping(value) : createPlatformMapping(defaultInternalSku), errors: {} });
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
      storeName: modal.value.storeName.trim(),
      internalSku: modal.value.internalSku.trim(),
      platformSkc: modal.value.platformSkc.trim(),
      platformSku: modal.value.platformSku.trim(),
      sheinProductId: modal.value.sheinProductId.trim(),
      platformSpu: modal.value.platformSpu.trim(),
      sellerSku: modal.value.sellerSku.trim(),
      sheinProductName: modal.value.sheinProductName.trim(),
      remark: modal.value.remark.trim(),
      updatedAt: now,
      createdAt: modal.mode === "create" ? now : modal.value.createdAt,
    };

    requestJson<PlatformSkuMapping>(
      modal.mode === "create" ? "/api/shein-mappings" : `/api/shein-mappings/${saved.id}`,
      {
        method: modal.mode === "create" ? "POST" : "PATCH",
        body: JSON.stringify(saved),
      },
    )
      .then((persisted) => {
        setMappings((current) =>
          modal.mode === "create" ? [persisted, ...current] : current.map((item) => (item.id === persisted.id ? persisted : item)),
        );
        pushToast("success", modal.mode === "create" ? "SHEIN 映射已新增" : "SHEIN 映射已保存");
        setModal(null);
      })
      .catch((error: Error) => pushToast("error", error.message));
  }, [companySkus, mappings, modal, pushToast, setMappings, setModal]);

  const requestMappingStatusChange = useCallback((item: PlatformSkuMapping, status: PlatformSkuMappingStatus) => {
    const action = status === "active" ? "启用" : "停用";
    setConfirm({
      title: `${action} SHEIN 映射`,
      description: `确认${action}「${item.platformSkc}」吗？`,
      confirmText: action,
      tone: status === "inactive" ? "danger" : "primary",
      onConfirm: () => {
        requestJson<PlatformSkuMapping>(`/api/shein-mappings/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        })
          .then((persisted) => {
            setMappings((current) => current.map((mapping) => (mapping.id === item.id ? persisted : mapping)));
            pushToast("success", `已${action} SHEIN 映射`);
            setConfirm(null);
          })
          .catch((error: Error) => pushToast("error", error.message));
      },
    });
  }, [pushToast, setConfirm, setMappings]);

  const requestMappingDelete = useCallback((item: PlatformSkuMapping) => {
    setConfirm({
      title: "删除 SHEIN 映射",
      description: `确认删除「${item.platformSkc}」吗？内部商品不会被删除。`,
      confirmText: "删除",
      tone: "danger",
      onConfirm: () => {
        fetch(`/api/shein-mappings/${item.id}`, { method: "DELETE" })
          .then((response) => {
            if (!response.ok) throw new Error("删除失败");
            setMappings((current) => current.filter((mapping) => mapping.id !== item.id));
            pushToast("success", "SHEIN 映射已删除");
            setConfirm(null);
          })
          .catch((error: Error) => pushToast("error", error.message));
      },
    });
  }, [pushToast, setConfirm, setMappings]);

  return {
    openMappingModal,
    saveMapping,
    requestMappingStatusChange,
    requestMappingDelete,
  };
}
