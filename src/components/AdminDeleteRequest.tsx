"use client";

/**
 * الحذف النهائي للطلب — يظهر لمسؤول النظام في كل حالات الطلب بلا استثناء.
 * التأكيد على خطوتين: زر يفتح تحذيرًا أحمر، والحذف لا ينفَّذ إلا من زر التأكيد داخله.
 */
import { useActionState, useState } from "react";
import { deleteRequestAction } from "@/actions/requests";
import { Alert, Button } from "@/components/ui";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: false };

export function AdminDeleteRequest({
  requestId,
  traineeName,
}: {
  requestId: string;
  traineeName: string;
}) {
  const [state, deleteAction, pending] = useActionState(deleteRequestAction, initialState);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      <p className="text-sm text-slate-600">
        الحذف يمحو الطلب من النظام نهائيًا: نصّ الطلب وبيانات المتدرب، وكل رسائل المحادثة،
        وسجل الحالة كاملًا. لا يمكن التراجع ولا استرجاع الطلب بعد الحذف، ولا يُشعَر به أي طرف.
      </p>

      <div>
        <Button
          type="button"
          variant={confirming ? "secondary" : "danger"}
          onClick={() => setConfirming((value) => !value)}
        >
          {confirming ? "إلغاء الحذف" : "حذف الطلب نهائيًا"}
        </Button>
      </div>

      {confirming ? (
        <form
          action={deleteAction}
          className="flex flex-col gap-3 rounded-lg bg-rose-50 p-4 ring-1 ring-rose-200"
        >
          <input type="hidden" name="requestId" value={requestId} />
          <p className="text-sm font-semibold text-rose-800">
            تأكيد الحذف النهائي لطلب المتدرب «{traineeName}»؟
          </p>
          <p className="text-xs leading-relaxed text-rose-700">
            سيُمحى الطلب ورسائله وسجل حالته فورًا، ولن يبقى له أثر في النظام ولا في صفحة تتبّع
            المتدرب. إن كان الطلب مفتوحًا فسيختفي كذلك من لوحة رئيس القسم أو وكيل التدريب.
          </p>
          {state.message ? (
            <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
          ) : null}
          <div>
            <Button type="submit" variant="danger" disabled={pending}>
              {pending ? "جارٍ الحذف..." : "تأكيد الحذف النهائي"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
