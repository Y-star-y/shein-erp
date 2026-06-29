import { requireAdmin } from "@/lib/auth-helpers";
import { lookupEmployeeByAccountOrPhone, lookupEmployeeByIdNumber } from "@/lib/user-lookup";
import { NextResponse } from "next/server";

function isIdNumberQuery(query: string) {
  return /^\d{15}$|^\d{17}[\dXx]$/.test(query.trim());
}

export async function GET(request: Request) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? params.get("email") ?? params.get("idNumber") ?? "").trim();
  if (!query) {
    return NextResponse.json({ error: "请提供证件号" }, { status: 400 });
  }

  if (isIdNumberQuery(query)) {
    const result = await lookupEmployeeByIdNumber(query);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        idNumber: result.idNumber,
        name: result.employeeName,
      },
    });
  }

  const result = await lookupEmployeeByAccountOrPhone(query);
  if ("error" in result) {
    const status = result.error === "手机号对应多名员工，请使用邮箱" ? 409 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    user: {
      email: result.employeeAccount,
      name: result.employeeName,
    },
  });
}
