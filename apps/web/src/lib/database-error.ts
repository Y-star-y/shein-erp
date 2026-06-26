export function databaseErrorMessage(error: unknown) {
  if (!process.env.DATABASE_URL) {
    return "缺少 DATABASE_URL：请复制 apps/web/.env.example 为 apps/web/.env 后重启 pnpm dev";
  }

  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const message = error instanceof Error ? error.message : "";

  if (code === "P1000") return "数据库账号或密码错误，请检查 DATABASE_URL";
  if (code === "P1001" || message.includes("Can't reach database server")) {
    return "数据库连接失败：请确认 192.168.110.16:5432 可访问，并检查 PostgreSQL/Docker 是否正在运行";
  }
  if (code === "P1003") return "数据库不存在：请确认 DATABASE_URL 中的数据库名为 shein_db";
  if (code === "P1010") return "数据库用户没有访问权限，请检查 PostgreSQL 授权配置";
  if (code === "P2021") return "数据库表不存在：请先执行 Prisma 迁移";
  if (message.includes("Environment variable not found") || message.includes("DATABASE_URL")) {
    return "DATABASE_URL 配置无效：请检查 apps/web/.env";
  }

  return "数据库请求失败，请检查服务端终端日志";
}

export function databaseErrorOrFallback(error: unknown, fallback: string) {
  const message = databaseErrorMessage(error);
  return message === "数据库请求失败，请检查服务端终端日志" ? fallback : message;
}

export function databaseErrorDetail(error: unknown) {
  if (process.env.NODE_ENV === "production") return undefined;
  return error instanceof Error ? error.message : String(error);
}
