import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/guards";
import { ROLE_HOME } from "@/lib/constants";

/** صفحة وسيطة: توجّه كل مستخدم إلى لوحة التحكم الخاصة بدوره بعد الدخول */
export default async function PostLoginPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(ROLE_HOME[user.role]);
}
