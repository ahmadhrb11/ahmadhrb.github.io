"use client";

/**
 * نموذج تغيير كلمة المرور للموظف نفسه.
 * الحقول تُفرَّغ بعد النجاح حتى لا تبقى كلمة المرور مكتوبة على الشاشة.
 */
import { useActionState, useEffect, useRef } from "react";
import { changeOwnPasswordAction } from "@/actions/account";
import { Alert, Button, Field, Input } from "@/components/ui";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: false };

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changeOwnPasswordAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4 px-5 py-4">
      <Field label="كلمة المرور الحالية" error={state.fieldErrors?.currentPassword}>
        <Input
          type="password"
          name="currentPassword"
          required
          autoComplete="current-password"
          placeholder="كلمة المرور التي تدخل بها اليوم"
        />
      </Field>

      <Field
        label="كلمة المرور الجديدة"
        error={state.fieldErrors?.newPassword}
        hint="6 أحرف على الأقل. اختر كلمة لا تُخمَّن بسهولة ولا تشاركها مع أحد."
      >
        <Input
          type="password"
          name="newPassword"
          required
          minLength={6}
          maxLength={72}
          autoComplete="new-password"
        />
      </Field>

      <Field label="تأكيد كلمة المرور الجديدة" error={state.fieldErrors?.confirmPassword}>
        <Input
          type="password"
          name="confirmPassword"
          required
          minLength={6}
          maxLength={72}
          autoComplete="new-password"
        />
      </Field>

      {state.message ? (
        <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "جارٍ الحفظ..." : "حفظ كلمة المرور الجديدة"}
        </Button>
      </div>
    </form>
  );
}
