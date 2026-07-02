import { deriveOrderStatusFromPlatform } from "@/lib/order-import";
import { lineNeedsInternalProductBinding } from "@/lib/order-scope";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type DbClient = Prisma.TransactionClient | typeof prisma;

export function orderHasBlockingUnmappedLines(
  lines: Parameters<typeof lineNeedsInternalProductBinding>[0][],
): boolean {
  return lines.some(lineNeedsInternalProductBinding);
}

export function resolveOrderStatusAfterLineChange(input: {
  lines: Parameters<typeof lineNeedsInternalProductBinding>[0][];
  platformStatus: string | null;
  currentStatus: string;
}) {
  if (orderHasBlockingUnmappedLines(input.lines)) {
    return "PENDING" as const;
  }

  if (input.currentStatus === "SHIPPED") {
    return "SHIPPED" as const;
  }

  return deriveOrderStatusFromPlatform(input.platformStatus ?? "");
}

export async function syncOrderStatuses(db: DbClient, orderIds: string[]) {
  const uniqueIds = [...new Set(orderIds)];
  if (!uniqueIds.length) return;

  const orders = await db.order.findMany({
    where: { id: { in: uniqueIds } },
    include: {
      lines: {
        select: {
          mappingStatus: true,
          sheinMappingId: true,
          sheinMapping: {
            select: {
              status: true,
              internalProductId: true,
            },
          },
        },
      },
    },
  });

  for (const order of orders) {
    const nextStatus = resolveOrderStatusAfterLineChange({
      lines: order.lines,
      platformStatus: order.platformStatus,
      currentStatus: order.status,
    });

    if (order.status !== nextStatus) {
      await db.order.update({
        where: { id: order.id },
        data: { status: nextStatus },
      });
    }
  }
}
