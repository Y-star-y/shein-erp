import { describe, expect, it } from "vitest";
import { resolveOrderLineMapping, type OrderLineMappingRef } from "@shein-erp/core";

describe("resolveImportOrderLineMapping flow", () => {
  const mappings: OrderLineMappingRef[] = [
    { platformSku: "plat-a", status: "active", internalProductId: "prod-1", id: "map-1" },
    { platformSku: "plat-b", status: "inactive", internalProductId: "prod-2", id: "map-2" },
  ];

  it("matches only by platform sku", () => {
    expect(resolveOrderLineMapping({ sellerSku: "any-seller", platformSku: "plat-a" }, mappings)).toEqual({
      status: "mapped",
      mappingId: "map-1",
    });
    expect(resolveOrderLineMapping({ sellerSku: "", platformSku: "plat-unknown" }, mappings)).toEqual({
      status: "unmapped",
    });
    expect(resolveOrderLineMapping({ sellerSku: "", platformSku: "plat-b" }, mappings)).toEqual({
      status: "unmapped",
    });
  });
});
