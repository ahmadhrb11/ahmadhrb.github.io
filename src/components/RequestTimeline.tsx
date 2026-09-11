/** سجل تغيّر حالة الطلب — يوضّح متى ولماذا حدث كل انتقال (شامل التصعيد) */
import type { RequestEvent } from "@prisma/client";
import { STATUS_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

export function RequestTimeline({ events }: { events: RequestEvent[] }) {
  if (events.length === 0) {
    return <p className="px-5 py-6 text-center text-sm text-slate-500">لا يوجد سجل بعد.</p>;
  }

  return (
    <ol className="flex flex-col gap-4 px-5 py-5">
      {events.map((event) => (
        <li key={event.id} className="border-r-2 border-slate-200 pr-4">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-bold text-slate-800">
              {event.fromStatus ? `${STATUS_LABELS[event.fromStatus]} ← ` : ""}
              {STATUS_LABELS[event.toStatus]}
            </span>
            <span className="text-xs text-slate-400">{formatDateTime(event.createdAt)}</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">بواسطة: {event.actorName}</p>
          {event.note ? <p className="preserve-lines mt-1 text-sm text-slate-600">{event.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}
