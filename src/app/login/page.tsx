import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { LoginForm } from "@/app/login/LoginForm";
import { getCurrentUser } from "@/lib/guards";
import { ROLE_HOME } from "@/lib/constants";

export const metadata = { title: "تسجيل الدخول | نظام متابعة طلبات المتدربين" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  // من سجّل دخوله مسبقًا يُعاد مباشرة إلى لوحته
  const user = await getCurrentUser();
  if (user) redirect(ROLE_HOME[user.role]);

  const { callbackUrl } = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-14">
        <h1 className="text-center text-2xl font-extrabold text-slate-900">دخول الموظفين</h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          مسؤول النظام · رؤساء الأقسام · وكيل التدريب
        </p>
        <div className="mt-8">
          <LoginForm callbackUrl={callbackUrl} />
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          المتدربون لا يحتاجون حسابًا — استخدم صفحة{" "}
          <Link href="/track" className="font-bold text-sky-600 hover:underline">
            تتبّع الطلبات
          </Link>
          .
        </p>
      </main>
    </>
  );
}
