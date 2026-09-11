import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { Card } from "@/components/ui";
import { shortId } from "@/lib/format";

export const metadata = { title: "تم إرسال الطلب" };

export default async function SubmitSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; n?: string }>;
}) {
  const { ref, n } = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-16">
        <Card className="p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
            ✓
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-slate-900">تم إرسال طلبك بنجاح</h1>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            طلبك الآن بحالة <span className="font-bold text-amber-700">«قيد المراجعة»</span> لدى مسؤول
            النظام. ستجد الردود عليه في صفحة تتبّع الطلبات.
          </p>

          {ref ? (
            <p className="mt-4 text-sm text-slate-500">
              الرقم المرجعي للطلب: <span className="font-mono font-bold text-slate-800">{shortId(ref)}</span>
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={n ? `/track/${encodeURIComponent(n)}` : "/track"}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              تتبّع طلباتي
            </Link>
            <Link
              href="/submit"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
            >
              تقديم طلب آخر
            </Link>
          </div>
        </Card>
      </main>
    </>
  );
}
