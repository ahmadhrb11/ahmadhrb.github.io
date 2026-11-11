import { DashboardShell } from "@/components/DashboardShell";
import { requireAnyRole } from "@/lib/guards";

/** حارس صفحة الحساب — لرئيس القسم ووكيل التدريب فقط */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAnyRole(["DEPT_HEAD", "DEPUTY"]);

  // الرابط الأول يعيده إلى لوحته حسب دوره، تمامًا كما في تخطيط كل لوحة
  const home =
    user.role === "DEPT_HEAD"
      ? { href: "/department", label: "طلباتي" }
      : { href: "/deputy", label: "الطلبات المُصعّدة" };

  return (
    <DashboardShell user={user} links={[home, { href: "/account", label: "حسابي" }]}>
      {children}
    </DashboardShell>
  );
}
