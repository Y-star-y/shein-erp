import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const orphanOrderWhere = { storeId: null } as const;
const orphanLineWhere = { order: { storeId: null } } as const;
const orphanImportJobWhere = { orders: { none: {} } } as const;

async function countOrphanTargets() {
  const [orderLineCount, orderCount, importJobCount] = await Promise.all([
    prisma.orderLine.count({ where: orphanLineWhere }),
    prisma.order.count({ where: orphanOrderWhere }),
    prisma.importJob.count({ where: orphanImportJobWhere }),
  ]);

  return { orderLineCount, orderCount, importJobCount };
}

async function countAllOrderTargets() {
  const [orderLineCount, orderCount, importJobCount] = await Promise.all([
    prisma.orderLine.count(),
    prisma.order.count(),
    prisma.importJob.count({ where: { type: "shein_order" } }),
  ]);

  return { orderLineCount, orderCount, importJobCount };
}

async function cleanupOrphans() {
  const deletedLines = await prisma.orderLine.deleteMany({ where: orphanLineWhere });
  const deletedOrders = await prisma.order.deleteMany({ where: orphanOrderWhere });
  const deletedJobs = await prisma.importJob.deleteMany({ where: orphanImportJobWhere });

  return {
    orderLineCount: deletedLines.count,
    orderCount: deletedOrders.count,
    importJobCount: deletedJobs.count,
  };
}

async function cleanupAllOrders() {
  const deletedLines = await prisma.orderLine.deleteMany();
  const deletedOrders = await prisma.order.deleteMany();
  const deletedJobs = await prisma.importJob.deleteMany({ where: { type: "shein_order" } });

  return {
    orderLineCount: deletedLines.count,
    orderCount: deletedOrders.count,
    importJobCount: deletedJobs.count,
  };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const confirmed = args.has("--yes");
  const allOrders = args.has("--all");

  if (!dryRun && !confirmed) {
    console.error("请指定 --dry-run（仅统计）或 --yes（确认删除）");
    console.error("可选: --all  删除全部订单数据（含已关联店铺的导入订单）");
    process.exit(1);
  }

  const label = allOrders ? "全部订单数据清理" : "无店铺关联订单清理";
  const counts = allOrders ? await countAllOrderTargets() : await countOrphanTargets();

  console.log(label);
  console.log(`  订单行 (OrderLine): ${counts.orderLineCount}`);
  console.log(`  订单 (Order):       ${counts.orderCount}`);
  console.log(`  导入记录 (ImportJob): ${counts.importJobCount}`);

  if (counts.orderCount === 0 && counts.orderLineCount === 0 && counts.importJobCount === 0) {
    console.log("\n没有需要清理的数据。");
    return;
  }

  if (dryRun) {
    const cmd = allOrders
      ? "pnpm db:cleanup-orphan-orders --all --yes"
      : "pnpm db:cleanup-orphan-orders --yes";
    console.log(`\n[dry-run] 未执行删除。确认后运行: ${cmd}`);
    return;
  }

  const deleted = allOrders ? await cleanupAllOrders() : await cleanupOrphans();

  console.log("\n已删除:");
  console.log(`  订单行: ${deleted.orderLineCount}`);
  console.log(`  订单:   ${deleted.orderCount}`);
  console.log(`  导入记录: ${deleted.importJobCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
