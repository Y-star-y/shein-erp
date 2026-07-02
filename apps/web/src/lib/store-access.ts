import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { Session } from "next-auth";

export function isStoreAdmin(session: Session) {
  return session.user.role === "ADMIN";
}

export function storesWhereForSession(session: Session): Prisma.StoreWhereInput {
  if (isStoreAdmin(session)) {
    return {};
  }
  return { ownerId: session.user.id };
}

export function mappingsWhereForSession(session: Session): Prisma.SheinProductMappingWhereInput {
  if (isStoreAdmin(session)) {
    return {};
  }
  return { store: { ownerId: session.user.id } };
}

export function ordersWhereForSession(session: Session): Prisma.OrderWhereInput {
  if (isStoreAdmin(session)) {
    return {};
  }
  return { store: { ownerId: session.user.id } };
}

export function orderLinesWhereForSession(session: Session): Prisma.OrderLineWhereInput {
  if (isStoreAdmin(session)) {
    return {};
  }
  return {
    OR: [
      { order: { store: { ownerId: session.user.id } } },
      { order: { storeId: null, importJob: { createdById: session.user.id } } },
    ],
  };
}

export function storeOwnerIdForCreate(session: Session) {
  return session.user.id;
}

const ownerSelect = { id: true, name: true, email: true } as const;

export async function findAccessibleStore(session: Session, storeId: string) {
  return prisma.store.findFirst({
    where: { id: storeId, ...storesWhereForSession(session) },
    include: { owner: { select: ownerSelect } },
  });
}

export async function findAccessibleStoresForSession(session: Session) {
  const includeOwner = isStoreAdmin(session);
  return prisma.store.findMany({
    where: storesWhereForSession(session),
    orderBy: [{ name: "asc" }, { updatedAt: "desc" }],
    include: includeOwner ? { owner: { select: ownerSelect } } : undefined,
  });
}

export async function resolveOrCreateStore(session: Session, storeName: string, platform: string) {
  const ownerId = storeOwnerIdForCreate(session);
  const name = storeName.trim();
  const platformValue = platform.trim() || "SHEIN";

  const existing = await prisma.store.findUnique({
    where: { ownerId_name: { ownerId, name } },
  });

  if (existing) {
    if (existing.platform !== platformValue) {
      return prisma.store.update({
        where: { id: existing.id },
        data: { platform: platformValue },
      });
    }
    return existing;
  }

  return prisma.store.create({
    data: { name, platform: platformValue, ownerId },
  });
}

export async function findAccessibleMapping(session: Session, mappingId: string) {
  return prisma.sheinProductMapping.findFirst({
    where: { id: mappingId, ...mappingsWhereForSession(session) },
    include: { store: true, internalProduct: true },
  });
}

export function toStoreRecord(
  store: {
    id: string;
    name: string;
    platform: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    owner?: { id: string; name: string; email: string };
  },
  includeOwner: boolean,
) {
  return {
    id: store.id,
    name: store.name,
    platform: store.platform,
    active: store.active,
    createdAt: store.createdAt.toISOString(),
    updatedAt: store.updatedAt.toISOString(),
    ...(includeOwner && store.owner
      ? {
          ownerId: store.owner.id,
          ownerName: store.owner.name,
          ownerEmail: store.owner.email,
        }
      : {}),
  };
}
