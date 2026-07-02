"use client";

import { nowText, useErpStore, getProductDisplayName, type CompanySku, type CompanySkuStatus, type OrderBindResumeContext } from "@shein-erp/shared";
import { normalizeProductAttributes } from "@shein-erp/shared";
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
  const { companySkus, setCompanySkus, setModal, modal, pushToast, setConfirm } = useErpStore();

  const openCompanyModal = useCallback(
    async (
      mode: "create" | "edit",
      value?: CompanySku,
      options?: {
        companyName?: string | null;
        allowCompanyEdit?: boolean;
        allowEmployeeAccountEdit?: boolean;
        productName?: string;
        spec?: string;
        articleNo?: string;
        resume?: OrderBindResumeContext;
      },
    ) => {
      if (mode === "create") {
        if (options?.allowCompanyEdit) {
          setModal({
            type: "company",
            mode,
            value: createCompanySku({
              productName: options.productName,
              spec: options.spec,
              articleNo: options.articleNo,
            }),
            errors: {},
            resume: options.resume,
          });
          return;
        }

        let resolvedCompanyName = options?.companyName?.trim();
        if (!resolvedCompanyName) {
          try {
            const response = await fetch("/api/me/profile");
            const data = (await response.json()) as {
              profile?: { companyName?: string | null };
            };
            resolvedCompanyName = data.profile?.companyName?.trim();
          } catch {
            resolvedCompanyName = "";
          }
        }

        if (!resolvedCompanyName) {
          pushToast("error", "当前账号未配置所属公司，无法新增内部商品");
          return;
        }

        setModal({
          type: "company",
          mode,
          value: createCompanySku({
            companyName: resolvedCompanyName,
            productName: options?.productName,
            spec: options?.spec,
            articleNo: options?.articleNo,
          }),
          errors: {},
          resume: options?.resume,
        });
        return;
      }

      setModal({ type: "company", mode, value: value ? normalizeCompanySku(value) : createCompanySku(), errors: {} });
    },
    [pushToast, setModal],
  );

  const saveCompanySku = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
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
        companyName: modal.value.companyName.trim(),
        attributes: normalizeProductAttributes(modal.value.attributes),
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
            modal.mode === "create"
              ? [persisted, ...current]
              : current.map((item) => (item.id === persisted.id ? persisted : item)),
          );
          if (modal.resume?.type === "orderBind") {
            pushToast("success", "内部商品已新增，请确认绑定");
            setModal({
              type: "orderBind",
              value: { ...modal.resume.value, internalProductId: persisted.id },
              errors: {},
            });
            return;
          }
          pushToast("success", modal.mode === "create" ? "内部商品已新增" : "内部商品已保存");
          setModal(null);
        })
        .catch((error: Error) => {
          pushToast("error", error.message);
        });
    },
    [companySkus, modal, pushToast, setCompanySkus, setModal],
  );

  const requestCompanyStatusChange = useCallback(
    (item: CompanySku, status: CompanySkuStatus) => {
      const action = status === "active" ? "启用" : "停用";
      setConfirm({
        title: `${action}内部商品`,
        description: `确认${action}「${getProductDisplayName(item)}」吗？${status === "inactive" ? "停用后不能再被新 SHEIN 映射选择。" : ""}`,
        confirmText: action,
        tone: status === "inactive" ? "danger" : "primary",
        onConfirm: () => {
          requestJson<CompanySku>(`/api/internal-products/${item.id}`, {
            method: "PATCH",
            body: JSON.stringify({ status }),
          })
            .then((persisted) => {
              setCompanySkus((current) => current.map((sku) => (sku.id === item.id ? persisted : sku)));
              pushToast("success", `已${action}内部商品`);
              setConfirm(null);
            })
            .catch((error: Error) => pushToast("error", error.message));
        },
      });
    },
    [pushToast, setCompanySkus, setConfirm],
  );

  const requestCompanyDelete = useCallback(
    (item: CompanySku) => {
      setConfirm({
        title: "删除内部商品",
        description: `确认删除「${getProductDisplayName(item)}」吗？已有 SHEIN 映射会保留，但会显示内部商品不存在。`,
        confirmText: "删除",
        tone: "danger",
        onConfirm: () => {
          fetch(`/api/internal-products/${item.id}`, { method: "DELETE" })
            .then((response) => {
              if (!response.ok) throw new Error("删除失败");
              setCompanySkus((current) => current.filter((sku) => sku.id !== item.id));
              pushToast("success", "内部商品已删除");
              setConfirm(null);
            })
            .catch((error: Error) => pushToast("error", error.message));
        },
      });
    },
    [pushToast, setCompanySkus, setConfirm],
  );

  return {
    openCompanyModal,
    saveCompanySku,
    requestCompanyStatusChange,
    requestCompanyDelete,
  };
}
