import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { transferUserStores } from "@/lib/store-transfer";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const { id: fromUserId } = await params;
  const body = (await request.json()) as { targetUserId?: string; storeIds?: string[] };

  const targetUserId = body.targetUserId?.trim();
  if (!targetUserId) {
    return NextResponse.json({ error: "请选择接收员工" }, { status: 400 });
  }

  if (body.storeIds?.length) {
    return NextResponse.json(
      { error: "仅支持整账号过户，请过户该员工全部店铺" },
      { status: 400 },
    );
  }

  const [fromUser, toUser] = await Promise.all([
    prisma.user.findUnique({
      where: { id: fromUserId },
      select: { id: true, name: true, email: true },
    }),
    prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, idNumber: true },
    }),
  ]);

  const result = await transferUserStores({
    fromUserId,
    toUserId: targetUserId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await writeAuditLog({
    userId: auditActorId(authResult.session),
    action: "店铺过户",
    entity: "User",
    entityId: fromUserId,
    detail: {
      fromUser: fromUser ? { id: fromUser.id, name: fromUser.name, email: fromUser.email } : fromUserId,
      toUser: toUser
        ? { id: toUser.id, name: toUser.name, email: toUser.email, idNumber: toUser.idNumber }
        : targetUserId,
      storeIds: "all",
      storeNames: result.storeNames,
      storeCount: result.storeCount,
      productCount: result.productCount,
    },
  });

  return NextResponse.json({
    ok: true,
    storeCount: result.storeCount,
    productCount: result.productCount,
    storeNames: result.storeNames,
  });
}
