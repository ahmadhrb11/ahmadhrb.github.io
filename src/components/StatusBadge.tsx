/** شارات ملوّنة لحالة الطلب ونوعه */
import type { RequestStatus, RequestType } from "@prisma/client";
import { STATUS_LABELS, STATUS_STYLES, TYPE_LABELS, TYPE_STYLES } from "@/lib/constants";

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function TypeBadge({ type }: { type: RequestType }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${TYPE_STYLES[type]}`}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}

/** عدّاد إشعارات دائري (يُخفى عند الصفر) */
export function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
      {count}
    </span>
  );
}
