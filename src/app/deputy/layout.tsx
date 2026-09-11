import { DashboardShell } from "@/components/DashboardShell";
import { requireRole } from "@/lib/guards";

/** حارس لوحة وكيل التدريب */
export default async function DeputyLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("DEPUTY");
  return (
    <DashboardShell user={user} links={[{ href: "/deputy", label: "الطلبات المُصعّدة" }]}>
      {children}
    </DashboardShell>
  );
}
