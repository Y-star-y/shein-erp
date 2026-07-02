export function toWarehouseRecord(warehouse: {
  id: string;
  code: string;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { stocks: number };
}) {
  return {
    id: warehouse.id,
    code: warehouse.code,
    name: warehouse.name,
    active: warehouse.active,
    stockCount: warehouse._count?.stocks ?? 0,
    createdAt: warehouse.createdAt.toISOString(),
    updatedAt: warehouse.updatedAt.toISOString(),
  };
}
