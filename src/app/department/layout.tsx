import { DashboardShell } from "@/components/DashboardShell";
import { requireRole } from "@/lib/guards";

/** حارس لوحة رئيس القسم */
export default async function DepartmentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("DEPT_HEAD");
  return (
    <DashboardShell user={user} links={[{ href: "/department", label: "طلباتي" }]}>
      {children}
    </DashboardShell>
  );
}
