/**
 * حُرّاس الصلاحيات — تُستخدم في تخطيطات الصفحات (layouts) وفي الـ Server Actions.
 * أي محاولة وصول بدور غير مناسب تُعاد توجيهها بدل إظهار بيانات لا تخص المستخدم.
 */
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/constants";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

/** يعيد المستخدم الحالي أو null */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role,
  };
}

/** يفرض تسجيل الدخول بدور محدد، وإلا يعيد التوجيه */
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(ROLE_HOME[role])}`);
  if (user.role !== role) redirect(ROLE_HOME[user.role]);
  return user;
}

/** يفرض تسجيل الدخول بأي دور من قائمة */
export async function requireAnyRole(roles: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect(ROLE_HOME[user.role]);
  return user;
}
