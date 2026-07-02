import { canAccessModule } from "@/lib/permissions";
import { getSessionOr401 } from "@/lib/auth-helpers";
import {
  countPendingOrders,
  fetchUnmappedGroups,
} from "@/lib/pending-tasks";
import type { OpsTodoTaskSummary, OpsTodosResponse } from "@shein-erp/shared";
import { NextResponse } from "next/server";

const PLACEHOLDER_TASKS: OpsTodoTaskSummary[] = [
  {
    id: "after_sales",
    title: "售后异常",
    description: "退货、退款与异常订单处理",
    count: 0,
    implemented: false,
  },
  {
    id: "shipment_exception",
    title: "发货异常",
    description: "超期未发、物流回传失败等",
    count: 0,
    implemented: false,
  },
];

export async function GET() {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  if (!canAccessModule(authResult.session.user, "orderManagement")) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const [groups, pendingOrderCount] = await Promise.all([
    fetchUnmappedGroups(authResult.session),
    countPendingOrders(authResult.session),
  ]);

  const tasks: OpsTodoTaskSummary[] = [
    ...(groups.length > 0
      ? [
          {
            id: "order_bind" as const,
            title: "待绑定商品",
            description: `${groups.length} 个 SKU 待绑定`,
            count: groups.length,
            implemented: true,
          },
        ]
      : []),
    {
      id: "pending_ship",
      title: "待发货",
      description:
        pendingOrderCount > 0
          ? `${pendingOrderCount} 笔订单待发货`
          : "查看各店铺待发货订单",
      count: pendingOrderCount,
      implemented: true,
    },
    ...PLACEHOLDER_TASKS,
  ];

  const response: OpsTodosResponse = { tasks };
  return NextResponse.json(response);
}
