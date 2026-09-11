import { SiteHeader } from "@/components/SiteHeader";
import { SubmitForm } from "@/app/submit/SubmitForm";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui";

export const metadata = { title: "تقديم طلب | نظام متابعة طلبات المتدربين" };

// التخصصات تُدار من لوحة الأدمن، لذا نقرأها ديناميكيًا في كل زيارة
export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const specialties = await prisma.specialty.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-extrabold text-slate-900">تقديم طلب جديد</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          املأ البيانات التالية. بعد الإرسال يصبح طلبك بحالة «قيد المراجعة»، ويمكنك متابعته لاحقًا من
          صفحة تتبّع الطلبات باستخدام رقمك التدريبي.
        </p>

        <div className="mt-6">
          {specialties.length === 0 ? (
            <Alert tone="warning">
              لا توجد تخصصات متاحة حاليًا. يرجى مراجعة مسؤول النظام لإضافة التخصصات.
            </Alert>
          ) : (
            <SubmitForm specialties={specialties} />
          )}
        </div>
      </main>
    </>
  );
}
