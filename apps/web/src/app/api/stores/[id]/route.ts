import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { findAccessibleStore, isStoreAdmin, toStoreRecord } from "@/lib/store-access";
import { verifyUserPassword } from "@/lib/user-profile";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "storeManagement");
  if (denied) return denied;

  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    platform?: string;
    active?: boolean;
    password?: string;
  };

  const store = await findAccessibleStore(authResult.session, id);
  if (!store) {
    return NextResponse.json({ error: "店铺不存在或无权访问" }, { status: 404 });
  }

  if (body.active === false && store.active) {
    const password = body.password?.toString() ?? "";
    if (!password) {
      return NextResponse.json({ error: "注销店铺需验证登录密码" }, { status: 400 });
    }

    const actor = await prisma.user.findUnique({ where: { id: authResult.session.user.id } });
    if (!actor?.passwordHash) {
      return NextResponse.json({ error: "当前账户未设置密码，请联系管理员" }, { status: 400 });
    }

    const valid = await verifyUserPassword(authResult.session.user.id, password);
    if (!valid) {
      return NextResponse.json({ error: "密码不正确" }, { status: 403 });
    }
  }

  if (body.name?.trim() && body.name.trim() !== store.name) {
    const duplicate = await prisma.store.findUnique({
      where: { ownerId_name: { ownerId: store.ownerId, name: body.name.trim() } },
    });
    if (duplicate) {
      return NextResponse.json({ error: "该员工已有同名店铺" }, { status: 409 });
    }
  }

  const updated = await prisma.store.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.platform !== undefined ? { platform: body.platform.trim() || "SHEIN" } : {}),
      ...(body.active !== undefined ? { active: body.active } : {}),
    },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });

  await writeAuditLog({
    userId: auditActorId(authResult.session),
    action: body.active === false && store.active ? "注销店铺" : "编辑店铺",
    entity: "Store",
    entityId: updated.id,
    detail: { name: updated.name, platform: updated.platform, active: updated.active, ownerId: updated.ownerId },
  });

  return NextResponse.json(toStoreRecord(updated, isStoreAdmin(authResult.session)));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "storeManagement");
  if (denied) return denied;

  const { id } = await params;
  const store = await findAccessibleStore(authResult.session, id);
  if (!store) {
    return NextResponse.json({ error: "店铺不存在或无权访问" }, { status: 404 });
  }

  const mappingCount = await prisma.sheinProductMapping.count({ where: { storeId: id } });
  if (mappingCount > 0) {
    return NextResponse.json({ error: "该店铺仍有关联映射，无法删除" }, { status: 409 });
  }

  await prisma.store.delete({ where: { id } });

  await writeAuditLog({
    userId: auditActorId(authResult.session),
    action: "删除店铺",
    entity: "Store",
    entityId: id,
    detail: { name: store.name, ownerId: store.ownerId },
  });

  return NextResponse.json({ ok: true });
}
