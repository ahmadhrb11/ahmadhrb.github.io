import { DashboardShell } from "@/components/DashboardShell";
import { requireRole } from "@/lib/guards";

/** حارس لوحة مسؤول النظام — أي دور آخر يُعاد توجيهه إلى لوحته */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("ADMIN");

  return (
    <DashboardShell
      user={user}
      links={[
        { href: "/admin", label: "الطلبات" },
        { href: "/admin/settings", label: "الإعدادات" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
