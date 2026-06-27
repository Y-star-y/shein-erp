"use client";

import {
  useErpStore,
  type OrderBindRequest,
  type OrderBindResult,
  type PlatformSkuMapping,
  type UnmappedSkcGroup,
} from "@shein-erp/shared";
import { useCallback } from "react";
import { createBindRequest, validateBindRequest } from "./model";

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

export function useOrderBindingActions(onBound?: () => void) {
  const { setCompanySkus, setMappings, setModal, modal, pushToast } = useErpStore();

  const openBindModal = useCallback(
    (group: UnmappedSkcGroup) => {
      setModal({
        type: "orderBind",
        value: createBindRequest(group),
        errors: {},
      });
    },
    [setModal],
  );

  const saveBind = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!modal || modal.type !== "orderBind") return;

      const payload: OrderBindRequest = {
        ...modal.value,
        platformSkc: modal.value.platformSkc.trim(),
        storeName: modal.value.storeName.trim(),
        internalSku: modal.value.internalSku.trim(),
        sellerSku: modal.value.sellerSku.trim(),
        platformSku: modal.value.platformSku.trim(),
        platformSpu: modal.value.platformSpu.trim(),
        sheinProductName: modal.value.sheinProductName.trim(),
        remark: modal.value.remark.trim(),
        newProduct: {
          internalSku: modal.value.newProduct.internalSku.trim(),
          productNameCn: modal.value.newProduct.productNameCn.trim(),
          productGroupName: modal.value.newProduct.productGroupName.trim(),
          specification: modal.value.newProduct.specification.trim(),
          color: modal.value.newProduct.color.trim(),
          size: modal.value.newProduct.size.trim(),
        },
      };

      const errors = validateBindRequest(payload);
      if (Object.keys(errors).length) {
        setModal({ ...modal, errors });
        pushToast("error", "请先修正表单错误");
        return;
      }

      requestJson<OrderBindResult>("/api/orders/bind", {
        method: "POST",
        body: JSON.stringify(payload),
      })
        .then((result) => {
          setMappings((current) => [result.mapping as PlatformSkuMapping, ...current]);
          if (result.companySku) {
            setCompanySkus((current) => [result.companySku!, ...current]);
          }
          const message = result.companySku
            ? `已创建内部商品并完成绑定，更新了 ${result.updatedLineCount} 条订单行`
            : `已绑定 SKC，更新了 ${result.updatedLineCount} 条订单行`;
          pushToast("success", message);
          setModal(null);
          onBound?.();
        })
        .catch((error: Error) => pushToast("error", error.message));
    },
    [modal, onBound, pushToast, setCompanySkus, setMappings, setModal],
  );

  const updateBindValue = useCallback(
    (value: OrderBindRequest) => {
      if (!modal || modal.type !== "orderBind") return;
      setModal({ ...modal, value, errors: { ...modal.errors, form: "" } });
    },
    [modal, setModal],
  );

  return {
    openBindModal,
    saveBind,
    updateBindValue,
  };
}
