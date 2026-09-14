"use client";

/** نموذج تقديم الطلب العام (بدون تسجيل دخول) */
import { useActionState, useState } from "react";
import { submitRequestAction } from "@/actions/requests";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { TYPE_LABELS } from "@/lib/constants";
import {
  TRAINEE_NUMBER_ERROR,
  TRAINEE_NUMBER_LENGTH,
  isValidTraineeNumber,
  type ActionState,
} from "@/lib/validation";

const initialState: ActionState = { ok: false };

export function SubmitForm({ specialties }: { specialties: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(submitRequestAction, initialState);
  const errors = state.fieldErrors ?? {};

  // تحقق فوري من الرقم التدريبي أثناء الكتابة — نفس الدالة المستخدمة في الخادم
  const [traineeNumber, setTraineeNumber] = useState("");
  const [touched, setTouched] = useState(false);
  const numberInvalid = touched && !isValidTraineeNumber(traineeNumber);
  // خطأ العميل الفوري يسبق خطأ الخادم في العرض، وكلاهما يظهر في نفس المكان
  const numberError = numberInvalid ? TRAINEE_NUMBER_ERROR : errors.traineeNumber;

  return (
    <Card className="p-6">
      <form action={formAction} className="flex flex-col gap-4">
        <Field label="اسم المتدرب" error={errors.traineeName}>
          <Input name="traineeName" required maxLength={120} placeholder="الاسم الثلاثي" />
        </Field>

        <Field
          label="الرقم التدريبي"
          error={numberError}
          hint={`${TRAINEE_NUMBER_LENGTH} أرقام — ستستخدمه لاحقًا لتتبّع جميع طلباتك`}
        >
          <Input
            name="traineeNumber"
            required
            inputMode="numeric"
            autoComplete="off"
            maxLength={TRAINEE_NUMBER_LENGTH}
            pattern="[0-9]{9}"
            title={TRAINEE_NUMBER_ERROR}
            placeholder="مثال: 442412345"
            value={traineeNumber}
            aria-invalid={numberInvalid || undefined}
            onChange={(event) => setTraineeNumber(event.target.value)}
            onBlur={() => setTouched(true)}
          />
        </Field>

        <Field label="التخصص" error={errors.specialtyId}>
          <Select name="specialtyId" required defaultValue="">
            <option value="" disabled>
              — اختر التخصص —
            </option>
            {specialties.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>
                {specialty.name}
              </option>
            ))}
          </Select>
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-slate-700">نوع الطلب</legend>
          <div className="flex flex-wrap gap-3">
            {(Object.keys(TYPE_LABELS) as (keyof typeof TYPE_LABELS)[]).map((type, index) => (
              <label
                key={type}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 has-checked:border-sky-500 has-checked:bg-sky-50 has-checked:text-sky-800"
              >
                <input type="radio" name="type" value={type} defaultChecked={index === 0} required />
                {TYPE_LABELS[type]}
              </label>
            ))}
          </div>
          {errors.type ? <p className="mt-1 text-xs font-medium text-rose-600">{errors.type}</p> : null}
        </fieldset>

        <Field label="نص الطلب" error={errors.body}>
          <Textarea
            name="body"
            required
            minLength={10}
            maxLength={4000}
            rows={6}
            placeholder="اشرح طلبك أو شكواك أو استفسارك بوضوح..."
          />
        </Field>

        {state.message && !state.ok ? <Alert tone="error">{state.message}</Alert> : null}

        <Button type="submit" disabled={pending || !isValidTraineeNumber(traineeNumber)}>
          {pending ? "جارٍ الإرسال..." : "إرسال الطلب"}
        </Button>
      </form>
    </Card>
  );
}
