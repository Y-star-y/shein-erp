import type { ErpState } from "./types";
import referenceData from "./reference-data.json";

export const demoState: ErpState = {
  warehouses: ["义乌一仓", "广州仓"],
  skus: referenceData.skus,
  orders: referenceData.orders as ErpState["orders"],
  stocks: referenceData.stocks,
  movements: [],
  shipments: [],
  shipmentDrafts: referenceData.shipmentDrafts,
  purchases: [
    {
      id: "po-1",
      purchaseNo: "PO-20260615-001",
      skuCode: "YC2001",
      quantity: 20,
      receivedQty: 0,
      unitPrice: 42,
      supplier: "广州佳衣",
      expectedAt: "2026-06-25",
      status: "已下单",
      carrier: "顺丰",
      domesticTrackNo: "SF-DEMO-001",
      internationalNo: "",
    },
  ],
  audits: [],
};
