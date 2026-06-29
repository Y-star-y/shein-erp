export function toCompanyRecord(company: {
  id: string;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { users: number };
}) {
  return {
    id: company.id,
    name: company.name,
    active: company.active,
    userCount: company._count?.users ?? 0,
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
  };
}
