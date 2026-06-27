import { auth } from "@/auth";
import { getPrismaClientStaleMessage } from "@/lib/api-response";
import { canAccessModule } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { AppModule, Role } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";

function staleClientResponse() {
  const message =
    getPrismaClientStaleMessage() ??
    "服务端 Prisma Client 未更新。请先停止 pnpm dev，在 apps/web 执行 pnpm db:generate，再重新 pnpm dev。";
  return NextResponse.json({ error: message }, { status: 503 });
}

export async function getSessionOr401(): Promise<
  { session: Session } | { error: NextResponse<{ error: string }> }
> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "未登录" }, { status: 401 }) };
  }

  const staleMessage = getPrismaClientStaleMessage();
  if (staleMessage) {
    return { error: staleClientResponse() };
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { active: true, sessionVersion: true },
    });

    if (!dbUser) {
      return { error: NextResponse.json({ error: "账户不存在" }, { status: 401 }) };
    }

    if (!dbUser.active) {
      return { error: NextResponse.json({ error: "账户已禁用" }, { status: 401 }) };
    }

    const tokenVersion = session.user.sessionVersion ?? 0;
    if (dbUser.sessionVersion !== tokenVersion) {
      return { error: NextResponse.json({ error: "会话已失效，请重新登录" }, { status: 401 }) };
    }

    return { session };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientValidationError &&
      error.message.includes("sessionVersion")
    ) {
      return { error: staleClientResponse() };
    }
    throw error;
  }
}

export async function requireAdmin(): Promise<
  { session: Session } | { error: NextResponse<{ error: string }> }
> {
  const authResult = await getSessionOr401();
  if ("error" in authResult) {
    return authResult;
  }

  if (authResult.session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "无权限" }, { status: 403 }) };
  }

  return authResult;
}

export function hasRole(session: Session, roles: Role[]) {
  return roles.includes(session.user.role);
}

export function requireModule(
  session: Session,
  module: AppModule,
): NextResponse<{ error: string }> | null {
  if (!canAccessModule(session.user, module)) {
    return NextResponse.json({ error: "无模块访问权限" }, { status: 403 });
  }
  return null;
}
