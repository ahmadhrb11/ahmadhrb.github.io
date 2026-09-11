"use client";

/** خانة نصية موحّدة لإرسال رسالة جديدة داخل المحادثة (للمتدرب أو للموظف) */
import { useActionState, useEffect, useRef } from "react";
import { Alert, Button, Textarea } from "@/components/ui";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: false };

export function MessageForm({
  action,
  requestId,
  traineeNumber,
  placeholder = "اكتب ردّك هنا...",
  submitLabel = "إرسال الرد",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  requestId: string;
  /** يُرسَل فقط من صفحة تتبّع المتدرب للتحقق من ملكية الطلب */
  traineeNumber?: string;
  placeholder?: string;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // تفريغ الحقل بعد الإرسال الناجح
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4">
      <input type="hidden" name="requestId" value={requestId} />
      {traineeNumber ? <input type="hidden" name="traineeNumber" value={traineeNumber} /> : null}

      <Textarea name="body" placeholder={placeholder} required maxLength={4000} aria-label="نص الرسالة" />

      {state.message ? <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert> : null}

      <div className="flex justify-start">
        <Button type="submit" disabled={pending}>
          {pending ? "جارٍ الإرسال..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
