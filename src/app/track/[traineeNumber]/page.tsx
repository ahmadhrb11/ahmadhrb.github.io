import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusBadge, TypeBadge } from "@/components/StatusBadge";
import { Card, CardHeader, EmptyState, RefCode } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { formatDateTime, shortId } from "@/lib/format";
import { isValidTraineeNumber } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const metadata = { title: "طلباتي | نظام متابعة طلبات المتدربين" };

/** قائمة جميع طلبات المتدرب — المفتاح هو الرقم التدريبي وحده */
export default async function TraineeRequestsPage({
  params,
}: {
  params: Promise<{ traineeNumber: string }>;
}) {
  const { traineeNumber: raw } = await params;
  const traineeNumber = decodeURIComponent(raw);

  // تحقق من الخادم لمن يكتب الرابط مباشرة متجاوزًا النموذج — قبل أي استعلام
  if (!isValidTraineeNumber(traineeNumber)) redirect("/track?error=format");

  const requests = await prisma.request.findMany({
    where: { traineeNumber },
    orderBy: { createdAt: "desc" },
    include: { specialty: true },
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">طلباتي</h1>
            <p className="mt-1 text-sm text-slate-600">
              الرقم التدريبي: <span className="font-bold text-slate-800">{traineeNumber}</span>
              {requests.length > 0 ? ` · ${requests[0].traineeName}` : ""}
            </p>
          </div>
          <Link
            href="/track"
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            رقم تدريبي آخر
          </Link>
        </div>

        <Card>
          <CardHeader title={`عدد الطلبات: ${requests.length}`} />
          {requests.length === 0 ? (
            <EmptyState
              title="لا توجد طلبات بهذا الرقم التدريبي"
              description="تأكد من صحة الرقم، أو قدّم طلبًا جديدًا من صفحة تقديم الطلب."
            />
          ) : (
            <ul className="divide-y divide-slate-200">
              {requests.map((request) => (
                <li key={request.id}>
                  <Link
                    href={`/track/${encodeURIComponent(traineeNumber)}/${request.id}`}
                    className="block px-5 py-4 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={request.status} />
                        <TypeBadge type={request.type} />
                        <RefCode id={shortId(request.id)} className="text-xs text-slate-400" />
                      </div>
                      <span className="text-xs text-slate-500">{formatDateTime(request.createdAt)}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700">{request.body}</p>
                    <p className="mt-1 text-xs text-slate-500">التخصص: {request.specialty.name}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </>
  );
}
