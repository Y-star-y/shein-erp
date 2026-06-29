import type { StoreRecord } from "@shein-erp/shared";

export type StoreFormValues = {
  name: string;
  platform: string;
  active: boolean;
};

export type OwnerStoreGroup = {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  stores: StoreRecord[];
};

export type { StoreRecord };
