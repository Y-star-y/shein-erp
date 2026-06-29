import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export function maskIdNumber(idNumber: string | null | undefined): string | null {
  if (!idNumber) return null;
  return "*".repeat(idNumber.length);
}

export function normalizePhone(value?: string) {
  const trimmed = value?.trim();
  return trimmed || null;
}

export function normalizeEmail(value?: string) {
  const trimmed = value?.trim().toLowerCase();
  return trimmed || null;
}

export function validatePhone(phone: string | null | undefined) {
  if (!phone) {
    return "手机号码不能为空";
  }
  if (!/^1\d{10}$/.test(phone)) {
    return "请输入有效的手机号码";
  }
  return null;
}

export function validateEmail(email: string | null | undefined) {
  if (!email) {
    return "邮箱不能为空";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "请输入有效邮箱";
  }
  return null;
}

export function normalizeIdNumber(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

export function validateIdNumber(idNumber: string | null | undefined) {
  if (!idNumber) {
    return "证件号不能为空";
  }
  if (!/^\d{15}$|^\d{17}[\dXx]$/.test(idNumber)) {
    return "证件号码格式不正确";
  }
  return null;
}

export async function verifyUserPassword(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) {
    return false;
  }
  return bcrypt.compare(password, user.passwordHash);
}
