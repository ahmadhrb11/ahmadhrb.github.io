/** ترويسة عامة تظهر في الصفحات العامة (غير لوحات التحكم) */
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="text-base font-extrabold text-slate-900">
          نظام متابعة طلبات المتدربين
        </Link>
        <nav className="flex items-center gap-2 text-sm font-semibold">
          <Link href="/submit" className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100">
            تقديم طلب
          </Link>
          <Link href="/track" className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100">
            تتبّع طلباتي
          </Link>
          <Link href="/login" className="rounded-lg bg-sky-600 px-3 py-1.5 text-white hover:bg-sky-700">
            دخول الموظفين
          </Link>
        </nav>
      </div>
    </header>
  );
}
