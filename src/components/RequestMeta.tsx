/** بطاقة بيانات المتدرب وتفاصيل الطلب */
import type { Prisma } from "@prisma/client";
import { StatusBadge, TypeBadge } from "@/components/StatusBadge";
import { RefCode } from "@/components/ui";
import { formatDateTime, shortId } from "@/lib/format";

type RequestWithRelations = Prisma.RequestGetPayload<{
  include: { specialty: true; assignedHead: true };
}>;

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  );
}

export function RequestMeta({ request }: { request: RequestWithRelations }) {
  return (
    <div className="px-5 py-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={request.status} />
        <TypeBadge type={request.type} />
        <span className="text-xs text-slate-400">
          رقم مرجعي: <RefCode id={shortId(request.id)} />
        </span>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Row label="اسم المتدرب" value={request.traineeName} />
        <Row label="الرقم التدريبي" value={request.traineeNumber} />
        {/* بريد مولّد تلقائيًا من الرقم التدريبي — جاهز لإشعارات البريد لاحقًا */}
        <Row
          label="بريد المتدرب (مولّد تلقائيًا)"
          value={<span dir="ltr">{request.traineeEmail}</span>}
        />
        <Row label="التخصص" value={request.specialty.name} />
        <Row label="تاريخ التقديم" value={formatDateTime(request.createdAt)} />
        <Row label="رئيس القسم المسؤول" value={request.assignedHead?.name ?? "— لم يُحوَّل بعد —"} />
        {request.approvedAt ? <Row label="تاريخ الموافقة" value={formatDateTime(request.approvedAt)} /> : null}
        {request.escalatedAt ? (
          <Row
            label="تاريخ التصعيد لوكيل التدريب"
            value={`${formatDateTime(request.escalatedAt)} — ${request.escalationReason ?? ""}`}
          />
        ) : null}
        {request.completedAt ? <Row label="تاريخ الإنهاء" value={formatDateTime(request.completedAt)} /> : null}
        {request.rejectedAt ? <Row label="تاريخ الرفض" value={formatDateTime(request.rejectedAt)} /> : null}
      </dl>

      <div className="mt-5 rounded-lg bg-slate-50 p-4">
        <p className="mb-1 text-xs font-semibold text-slate-500">نص الطلب الأصلي</p>
        <p className="preserve-lines text-sm leading-7 text-slate-800">{request.body}</p>
      </div>

      {request.rejectionReason ? (
        <div className="mt-4 rounded-lg bg-rose-50 p-4 ring-1 ring-rose-200">
          <p className="mb-1 text-xs font-semibold text-rose-700">سبب الرفض</p>
          <p className="preserve-lines text-sm leading-7 text-rose-900">{request.rejectionReason}</p>
        </div>
      ) : null}
    </div>
  );
}
