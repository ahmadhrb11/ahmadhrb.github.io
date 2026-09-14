"use client";

/**
 * نموذج إدخال الرقم التدريبي في /track.
 *
 * مكوّن عميل مستقل لأن الصفحة نفسها مكوّن خادم ولا يمكنها التحقق الفوري.
 * التحقق هنا للراحة فقط — الخادم يعيد التحقق دائمًا ولا يثق بهذه الطبقة.
 */
import { useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import {
  TRAINEE_NUMBER_ERROR,
  TRAINEE_NUMBER_LENGTH,
  isValidTraineeNumber,
} from "@/lib/validation";

export function TrackForm({
  action,
  serverError,
}: {
  action: (formData: FormData) => void | Promise<void>;
  /** خطأ عائد من الخادم (مثلًا عند تجاوز تحقق العميل) */
  serverError?: string;
}) {
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);

  const invalid = touched && !isValidTraineeNumber(value);
  const error = invalid ? TRAINEE_NUMBER_ERROR : serverError;

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="الرقم التدريبي" error={error} hint={`${TRAINEE_NUMBER_LENGTH} أرقام`}>
        <Input
          name="traineeNumber"
          required
          autoFocus
          inputMode="numeric"
          autoComplete="off"
          maxLength={TRAINEE_NUMBER_LENGTH}
          pattern="[0-9]{9}"
          title={TRAINEE_NUMBER_ERROR}
          placeholder="مثال: 442412345"
          value={value}
          aria-invalid={invalid || undefined}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => setTouched(true)}
        />
      </Field>
      <Button type="submit" disabled={!isValidTraineeNumber(value)}>
        عرض طلباتي
      </Button>
    </form>
  );
}
