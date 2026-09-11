"use client";

/**
 * أزرار إجراءات الأدمن على الطلب:
 * - «قيد المراجعة» → موافقة (تحويل تلقائي لرئيس القسم) أو رفض بسبب مكتوب.
 * - «قيد المعالجة» أو «مُصعّد» → إنهاء الطلب يدويًا وإيقاف المحادثة.
 */
import { useActionState, useState } from "react";
import type { RequestStatus } from "@prisma/client";
import { approveRequestAction, completeRequestAction, rejectRequestAction } from "@/actions/requests";
import { Alert, Button, Textarea } from "@/components/ui";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: false };

export function AdminRequestActions({
  requestId,
  status,
  headName,
}: {
  requestId: string;
  status: RequestStatus;
  headName?: string | null;
}) {
  const [approveState, approveAction, approvePending] = useActionState(approveRequestAction, initialState);
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectRequestAction, initialState);
  const [completeState, completeAction, completePending] = useActionState(completeRequestAction, initialState);
  const [showReject, setShowReject] = useState(false);

  if (status === "PENDING_REVIEW") {
    return (
      <div className="flex flex-col gap-3 px-5 py-4">
        <p className="text-sm text-slate-600">
          عند الموافقة سيُحوَّل الطلب تلقائيًا إلى رئيس القسم المرتبط بالتخصص
          {headName ? `: ${headName}` : " (لا يوجد رئيس قسم مرتبط — اربطه من الإعدادات أولًا)"}.
        </p>

        <div className="flex flex-wrap gap-2">
          <form action={approveAction}>
            <input type="hidden" name="requestId" value={requestId} />
            <Button type="submit" variant="success" disabled={approvePending}>
              {approvePending ? "جارٍ التنفيذ..." : "موافقة وتحويل لرئيس القسم"}
            </Button>
          </form>

          <Button type="button" variant="danger" onClick={() => setShowReject((value) => !value)}>
            {showReject ? "إلغاء الرفض" : "رفض الطلب"}
          </Button>
        </div>

        {approveState.message ? (
          <Alert tone={approveState.ok ? "success" : "error"}>{approveState.message}</Alert>
        ) : null}

        {showReject ? (
          <form action={rejectAction} className="flex flex-col gap-3 rounded-lg bg-rose-50 p-4 ring-1 ring-rose-200">
            <input type="hidden" name="requestId" value={requestId} />
            <label className="text-sm font-semibold text-rose-800">
              سبب الرفض (سيظهر للمتدرب في صفحة تتبّع طلباته)
            </label>
            <Textarea name="reason" required minLength={3} maxLength={1000} placeholder="اكتب سببًا مختصرًا وواضحًا..." />
            {rejectState.message ? (
              <Alert tone={rejectState.ok ? "success" : "error"}>{rejectState.message}</Alert>
            ) : null}
            <div>
              <Button type="submit" variant="danger" disabled={rejectPending}>
                {rejectPending ? "جارٍ الرفض..." : "تأكيد الرفض"}
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    );
  }

  if (status === "IN_PROGRESS" || status === "ESCALATED") {
    return (
      <div className="flex flex-col gap-3 px-5 py-4">
        <p className="text-sm text-slate-600">
          يمكنك إنهاء الطلب يدويًا في أي وقت بعد الموافقة. بعد الإنهاء لا يمكن لأي طرف إضافة ردود جديدة.
        </p>
        <form action={completeAction}>
          <input type="hidden" name="requestId" value={requestId} />
          <Button type="submit" variant="primary" disabled={completePending}>
            {completePending ? "جارٍ الإنهاء..." : "إنهاء الطلب"}
          </Button>
        </form>
        {completeState.message ? (
          <Alert tone={completeState.ok ? "success" : "error"}>{completeState.message}</Alert>
        ) : null}
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      <Alert tone="info">هذا الطلب مغلق ولا توجد إجراءات متاحة عليه.</Alert>
    </div>
  );
}
