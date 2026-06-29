import { prisma } from "@/lib/prisma";
import { normalizeEmail, normalizeIdNumber, validateEmail, validateIdNumber, validatePhone } from "@/lib/user-profile";
import { Role } from "@prisma/client";

const employeeSelect = {
  name: true,
  email: true,
  idNumber: true,
  active: true,
  role: true,
} as const;

function isActiveEmployee(user: { active: boolean; role: Role } | null | undefined) {
  return Boolean(user?.active && user.role !== Role.ADMIN);
}

export async function lookupEmployeeByIdNumber(input: string) {
  const idNumber = normalizeIdNumber(input);
  const formatError = validateIdNumber(idNumber);
  if (formatError) {
    return { error: formatError };
  }

  const user = await prisma.user.findUnique({
    where: { idNumber: idNumber! },
    select: employeeSelect,
  });

  if (!isActiveEmployee(user)) {
    return { error: "证件号对应员工不存在或已停用" as const };
  }

  return {
    idNumber: user!.idNumber!,
    employeeName: user!.name.trim(),
  };
}

export async function lookupEmployeeByAccountOrPhone(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return { error: "请提供员工账号或手机号" as const };
  }

  if (trimmed.includes("@")) {
    const email = normalizeEmail(trimmed);
    const emailError = validateEmail(email);
    if (emailError || !email) {
      return { error: "请输入有效员工账号" as const };
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: employeeSelect,
    });

    if (!isActiveEmployee(user)) {
      return { error: "员工账号不存在或已停用" as const };
    }

    return {
      employeeAccount: user!.email.trim().toLowerCase(),
      employeeName: user!.name.trim(),
      idNumber: user!.idNumber?.trim() ?? "",
    };
  }

  const phone = trimmed.replace(/\s/g, "");
  const phoneError = validatePhone(phone);
  if (phoneError) {
    return { error: "请输入有效手机号" as const };
  }

  const users = await prisma.user.findMany({
    where: { phone, role: { not: Role.ADMIN } },
    select: employeeSelect,
    take: 2,
  });

  const activeUsers = users.filter((user) => user.active);
  if (activeUsers.length === 0) {
    return { error: "员工账号不存在或已停用" as const };
  }
  if (activeUsers.length > 1) {
    return { error: "手机号对应多名员工，请使用邮箱" as const };
  }

  const user = activeUsers[0]!;
  return {
    employeeAccount: user.email.trim().toLowerCase(),
    employeeName: user.name.trim(),
    idNumber: user.idNumber?.trim() ?? "",
  };
}

export function shouldLookupEmployeeInput(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (trimmed.includes("@")) return true;
  return /^1\d{10}$/.test(trimmed.replace(/\s/g, ""));
}
