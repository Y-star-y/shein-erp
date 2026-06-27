import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getPrismaClientStaleMessage } from "@/lib/api-response";
import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  isStoreAdmin,
  storeOwnerIdForCreate,
  storesWhereForSession,
  toStoreRecord,
} from "@/lib/store-access";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "storeManagement");
  if (denied) return denied;

  const stale = getPrismaClientStaleMessage();
  if (stale) {
    return NextResponse.json({ error: stale }, { status: 503 });
  }

  try {
    const includeOwner = isStoreAdmin(authResult.session);
    const stores = await prisma.store.findMany({
      where: storesWhereForSession(authResult.session),
      orderBy: { updatedAt: "desc" },
      include: includeOwner ? { owner: { select: { id: true, name: true, email: true } } } : undefined,
    });

    return NextResponse.json({ stores: stores.map((store) => toStoreRecord(store, includeOwner)) });
  } catch (error) {
    console.error("[GET /api/stores]", error);
    const staleMessage = getPrismaClientStaleMessage();
    return NextResponse.json(
      { error: staleMessage ?? "加载店铺失败，请稍后重试" },
      { status: staleMessage ? 503 : 500 },
    );
  }
}

export async function POST(request: Request) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "storeManagement");
  if (denied) return denied;

  const stale = getPrismaClientStaleMessage();
  if (stale) {
    return NextResponse.json({ error: stale }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { name?: string; platform?: string; active?: boolean };
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "店铺名称不能为空" }, { status: 400 });
    }

    const ownerId = storeOwnerIdForCreate(authResult.session);
    const existing = await prisma.store.findUnique({
      where: { ownerId_name: { ownerId, name } },
    });
    if (existing) {
      return NextResponse.json({ error: "您已有同名店铺" }, { status: 409 });
    }

    const store = await prisma.store.create({
      data: {
        name,
        platform: body.platform?.trim() || "SHEIN",
        active: body.active ?? true,
        ownerId,
      },
      include: isStoreAdmin(authResult.session)
        ? { owner: { select: { id: true, name: true, email: true } } }
        : undefined,
    });

    await writeAuditLog({
      userId: auditActorId(authResult.session),
      action: "新增店铺",
      entity: "Store",
      entityId: store.id,
      detail: { name: store.name, platform: store.platform, ownerId },
    });

    return NextResponse.json(toStoreRecord(store, isStoreAdmin(authResult.session)), { status: 201 });
  } catch (error) {
    console.error("[POST /api/stores]", error);
    const staleMessage = getPrismaClientStaleMessage();
    return NextResponse.json(
      { error: staleMessage ?? "创建店铺失败，请稍后重试" },
      { status: staleMessage ? 503 : 500 },
    );
  }
}
