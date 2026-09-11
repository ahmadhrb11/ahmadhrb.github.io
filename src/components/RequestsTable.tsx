/** جدول الطلبات المستخدم في لوحات الأدمن ورئيس القسم ووكيل التدريب */
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { StatusBadge, TypeBadge } from "@/components/StatusBadge";
import { EmptyState, RefCode } from "@/components/ui";
import { formatDateTime, shortId } from "@/lib/format";

type Row = Prisma.RequestGetPayload<{
  include: { specialty: true; assignedHead: true };
}> & {
  /** هل ينتظر الطلب ردًّا من المستخدم الحالي؟ */
  awaitingReply?: boolean;
};

export function RequestsTable({
  requests,
  basePath,
  showSpecialty = true,
  showAssignedHead = true,
  emptyTitle = "لا توجد طلبات مطابقة",
  emptyDescription,
}: {
  requests: Row[];
  /** مسار صفحة التفاصيل، مثل /admin/requests */
  basePath: string;
  showSpecialty?: boolean;
  showAssignedHead?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (requests.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-right text-sm">
        <thead className="bg-slate-50 text-xs font-bold text-slate-600">
          <tr>
            <th className="px-4 py-3">المرجع</th>
            <th className="px-4 py-3">المتدرب</th>
            <th className="px-4 py-3">الرقم التدريبي</th>
            {showSpecialty ? <th className="px-4 py-3">التخصص</th> : null}
            <th className="px-4 py-3">النوع</th>
            <th className="px-4 py-3">الحالة</th>
            {showAssignedHead ? <th className="px-4 py-3">رئيس القسم</th> : null}
            <th className="px-4 py-3">تاريخ التقديم</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {requests.map((request) => (
            <tr key={request.id} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                <RefCode id={shortId(request.id)} />
              </td>
              <td className="px-4 py-3 font-semibold text-slate-800">
                <span className="flex items-center gap-2">
                  {request.traineeName}
                  {request.awaitingReply ? (
                    <span className="inline-block h-2 w-2 rounded-full bg-rose-500" title="بانتظار ردّك" />
                  ) : null}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{request.traineeNumber}</td>
              {showSpecialty ? <td className="px-4 py-3 text-slate-600">{request.specialty.name}</td> : null}
              <td className="px-4 py-3">
                <TypeBadge type={request.type} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={request.status} />
              </td>
              {showAssignedHead ? (
                <td className="px-4 py-3 text-slate-600">{request.assignedHead?.name ?? "—"}</td>
              ) : null}
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                {formatDateTime(request.createdAt)}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`${basePath}/${request.id}`}
                  className="whitespace-nowrap font-semibold text-sky-600 hover:underline"
                >
                  عرض
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
