import type { AppModule, Role } from "@prisma/client";
import type { PageKey } from "@shein-erp/shared";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "管理员",
  OPERATIONS: "运营部",
  LOGISTICS: "物流部",
};

export const GENDER_LABELS = {
  MALE: "男",
  FEMALE: "女",
} as const;

export const EMPLOYEE_ROLES: Role[] = ["OPERATIONS", "LOGISTICS"];

export const MODULE_LABELS: Record<AppModule, string> = {
  productManagement: "商品管理",
  storeManagement: "店铺管理",
  inventoryManagement: "库存管理",
  orderManagement: "待办任务",
  platformMappings: "SHEIN映射",
  warehouseManagement: "仓库管理",
  companyManagement: "公司管理",
  userManagement: "员工管理",
};

export const OPERATIONS_MODULES: AppModule[] = [
  "productManagement",
  "storeManagement",
  "inventoryManagement",
  "orderManagement",
];

export const LOGISTICS_MODULES: AppModule[] = ["warehouseManagement"];

export const ASSIGNABLE_BY_ROLE: Record<Exclude<Role, "ADMIN">, AppModule[]> = {
  OPERATIONS: OPERATIONS_MODULES,
  LOGISTICS: LOGISTICS_MODULES,
};

export const ADMIN_MODULES: AppModule[] = [
  ...OPERATIONS_MODULES,
  "warehouseManagement",
  "companyManagement",
  "userManagement",
];

export const ROLE_DEFAULT_MODULES = ASSIGNABLE_BY_ROLE;

export function resolveUserPermissions(role: Role, permissions: AppModule[]): AppModule[] {
  if (role === "ADMIN") {
    return [...ADMIN_MODULES];
  }
  return permissions;
}

export function normalizePermissions(
  role: Role,
  selected: AppModule[],
): { permissions: AppModule[] } | { error: string } {
  if (role === "ADMIN") {
    return { error: "不能通过此接口创建管理员账户" };
  }

  const allowed = ASSIGNABLE_BY_ROLE[role as Exclude<Role, "ADMIN">] ?? [];
  const filtered = selected.filter(
    (module) => module !== "userManagement" && module !== "companyManagement" && allowed.includes(module),
  );
  const unique = [...new Set(filtered)];

  if (!unique.length) {
    return { error: "至少选择一个可访问模块" };
  }

  return { permissions: unique };
}

export function canAccessModule(
  user: { permissions?: AppModule[] },
  module: AppModule | PageKey,
): boolean {
  if (module === "profile") {
    return true;
  }
  const permissions = user.permissions ?? [];
  return permissions.includes(module as AppModule);
}

export function canAccessMappings(user: { permissions?: AppModule[] }): boolean {
  return (
    canAccessModule(user, "platformMappings") ||
    canAccessModule(user, "storeManagement") ||
    canAccessModule(user, "orderManagement")
  );
}

const PAGE_ORDER: PageKey[] = [
  "orderManagement",
  "productManagement",
  "storeManagement",
  "inventoryManagement",
  "warehouseManagement",
  "companyManagement",
  "userManagement",
];

export function firstAccessiblePage(permissions: AppModule[]): PageKey {
  return PAGE_ORDER.find((page) => permissions.includes(page as AppModule)) ?? "orderManagement";
}

export function toUserRecord(user: {
  id: string;
  name: string;
  email: string;
  gender?: "MALE" | "FEMALE" | null;
  idNumber?: string | null;
  phone?: string | null;
  role: Role;
  companyId?: string | null;
  company?: { id: string; name: string } | null;
  permissions: AppModule[];
  active: boolean;
  failedLoginAttempts?: number;
  loginFailureWindowStart?: Date | null;
  lockedUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const lockedUntil = user.lockedUntil ?? null;
  const loginLocked = Boolean(lockedUntil && lockedUntil > new Date());

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    gender: user.gender ?? null,
    idNumber: user.idNumber ?? null,
    phone: user.phone ?? null,
    role: user.role,
    companyId: user.companyId ?? user.company?.id ?? null,
    companyName: user.company?.name ?? null,
    permissions: user.permissions,
    active: user.active,
    failedLoginAttempts: user.failedLoginAttempts ?? 0,
    loginFailureWindowStart: user.loginFailureWindowStart?.toISOString() ?? null,
    lockedUntil: lockedUntil?.toISOString() ?? null,
    loginLocked,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
