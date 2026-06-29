import { prisma } from "@/lib/prisma";
import { lookupEmployeeByAccountOrPhone } from "@/lib/user-lookup";
import {
  getEditableProductAttributes,
  getEmployeeAccountAttribute,
  getEmployeeIdNumberAttribute,
  getProductNameAttribute,
  mergeStoredTopLevelAttributes,
  normalizeProductAttributes,
  validateProductAttributes,
  type ProductAttribute,
} from "@shein-erp/shared";
import type { Session } from "next-auth";

export async function resolveUserCompanyName(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: { select: { name: true, active: true } } },
  });

  const name = user?.company?.name?.trim() ?? "";
  if (!name || user?.company?.active === false) {
    return "";
  }

  return name;
}

export async function resolveUserIdNumber(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { idNumber: true },
  });

  return user?.idNumber?.trim() ?? "";
}

export async function resolveProductCompanyName(session: Session, requestedCompanyName?: string) {
  if (session.user.role === "ADMIN") {
    const companyName = requestedCompanyName?.trim() ?? "";
    if (!companyName) {
      return { error: "请选择公司名称" as const };
    }

    const company = await prisma.company.findFirst({
      where: { name: companyName, active: true },
      select: { name: true },
    });

    if (!company) {
      return { error: "公司不存在或已停用" as const };
    }

    return { companyName: company.name };
  }

  const companyName = await resolveUserCompanyName(session.user.id);
  if (!companyName) {
    return { error: "当前账号未配置所属公司" as const };
  }

  return { companyName };
}

async function resolveIdNumberForSave(
  session: Session,
  normalized: ProductAttribute[],
  options?: { preserveIdNumber?: string },
) {
  if (session.user.role === "ADMIN") {
    const employeeAccount = getEmployeeAccountAttribute(normalized).trim();
    if (employeeAccount) {
      const lookup = await lookupEmployeeByAccountOrPhone(employeeAccount);
      if ("error" in lookup) {
        return { error: lookup.error };
      }
      if (!lookup.idNumber) {
        return { error: "该员工未配置证件号" as const };
      }
      return { idNumber: lookup.idNumber };
    }

    if (options?.preserveIdNumber?.trim()) {
      return { idNumber: options.preserveIdNumber.trim() };
    }

    return { error: "请填写员工账号" as const };
  }

  if (options?.preserveIdNumber?.trim()) {
    return { idNumber: options.preserveIdNumber.trim() };
  }

  const idNumber = await resolveUserIdNumber(session.user.id);
  if (!idNumber) {
    return { error: "当前账号未配置证件号" as const };
  }

  return { idNumber };
}

export async function resolveProductAttributesForSave(
  session: Session,
  input: unknown,
  options?: { preserveIdNumber?: string },
) {
  const normalized = normalizeProductAttributes(input);
  const productName = getProductNameAttribute(normalized);

  if (!productName.trim()) {
    return { error: "产品名称不能为空" as const };
  }

  const idNumberResult = await resolveIdNumberForSave(session, normalized, options);
  if ("error" in idNumberResult) {
    return { error: idNumberResult.error };
  }

  const editable = getEditableProductAttributes(normalized);
  const attributeErrors = validateProductAttributes(editable.filter((attribute) => attribute.key.trim()));
  if (Object.keys(attributeErrors).length) {
    return { error: "参数填写有误" as const };
  }

  return {
    attributes: mergeStoredTopLevelAttributes(editable, {
      productName,
      idNumber: idNumberResult.idNumber,
    }) as ProductAttribute[],
  };
}

export function readStoredEmployeeIdNumber(attributes: unknown) {
  return getEmployeeIdNumberAttribute(normalizeProductAttributes(attributes));
}
