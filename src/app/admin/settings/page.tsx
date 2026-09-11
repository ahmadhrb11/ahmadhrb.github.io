import { SpecialtyManager } from "@/components/SpecialtyManager";
import { UserManager } from "@/components/UserManager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "الإعدادات | لوحة مسؤول النظام" };

/** صفحة الإدارة: التخصصات + رؤساء الأقسام + الربط بينهما */
export default async function AdminSettingsPage() {
  const [specialties, users] = await Promise.all([
    prisma.specialty.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { requests: true } } },
    }),
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      include: { headedSpecialties: { select: { name: true } } },
    }),
  ]);

  const heads = users
    .filter((user) => user.role === "DEPT_HEAD" && user.isActive)
    .map((user) => ({ id: user.id, name: user.name }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold text-slate-900">الإعدادات</h1>

      <SpecialtyManager
        heads={heads}
        specialties={specialties.map((specialty) => ({
          id: specialty.id,
          name: specialty.name,
          isActive: specialty.isActive,
          headId: specialty.headId,
          requestCount: specialty._count.requests,
        }))}
      />

      <UserManager
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          specialtyNames: user.headedSpecialties.map((specialty) => specialty.name),
        }))}
      />
    </div>
  );
}
