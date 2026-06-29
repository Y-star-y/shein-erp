import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, role: true },
  });

  if (!user || user.role === Role.ADMIN) {
    return NextResponse.json({ error: "员工不存在" }, { status: 404 });
  }

  const stores = await prisma.store.findMany({
    where: { ownerId: id },
    select: {
      id: true,
      name: true,
      platform: true,
      active: true,
      _count: { select: { sheinMappings: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    user: { id: user.id, name: user.name },
    stores: stores.map((store) => ({
      id: store.id,
      name: store.name,
      platform: store.platform,
      active: store.active,
      mappingCount: store._count.sheinMappings,
    })),
  });
}
