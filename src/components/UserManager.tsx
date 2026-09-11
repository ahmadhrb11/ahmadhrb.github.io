"use client";

/** إدارة حسابات الموظفين: رؤساء الأقسام ووكيل التدريب ومسؤولو النظام */
import { useActionState } from "react";
import type { Role } from "@prisma/client";
import { createUserAction, updateUserAction } from "@/actions/settings";
import { Alert, Button, Card, CardHeader, Field, Input, Select } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/constants";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: false };

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  specialtyNames: string[];
};

export function UserManager({ users }: { users: UserRow[] }) {
  const [createState, createAction, createPending] = useActionState(createUserAction, initialState);
  const [updateState, updateAction, updatePending] = useActionState(updateUserAction, initialState);

  return (
    <Card>
      <CardHeader
        title="حسابات الموظفين"
        subtitle="أضف رؤساء الأقسام أو وكيل التدريب، ثم اربط كل رئيس قسم بتخصصه من القسم أعلاه."
      />

      <form action={createAction} className="grid grid-cols-1 items-end gap-3 border-b border-slate-200 px-5 py-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="الاسم" error={createState.fieldErrors?.name}>
          <Input name="name" required maxLength={120} placeholder="الاسم الكامل" />
        </Field>
        <Field label="البريد الإلكتروني" error={createState.fieldErrors?.email}>
          <Input name="email" type="email" required placeholder="head@example.com" />
        </Field>
        <Field label="كلمة المرور" error={createState.fieldErrors?.password}>
          <Input name="password" type="password" required minLength={6} placeholder="6 أحرف على الأقل" />
        </Field>
        <Field label="الدور">
          <Select name="role" defaultValue="DEPT_HEAD">
            <option value="DEPT_HEAD">{ROLE_LABELS.DEPT_HEAD}</option>
            <option value="DEPUTY">{ROLE_LABELS.DEPUTY}</option>
            <option value="ADMIN">{ROLE_LABELS.ADMIN}</option>
          </Select>
        </Field>
        <Button type="submit" disabled={createPending}>
          {createPending ? "جارٍ الإضافة..." : "إضافة حساب"}
        </Button>
        {createState.message ? (
          <div className="lg:col-span-5 sm:col-span-2">
            <Alert tone={createState.ok ? "success" : "error"}>{createState.message}</Alert>
          </div>
        ) : null}
      </form>

      {updateState.message ? (
        <div className="px-5 pt-4">
          <Alert tone={updateState.ok ? "success" : "error"}>{updateState.message}</Alert>
        </div>
      ) : null}

      <ul className="divide-y divide-slate-200">
        {users.map((user) => (
          <li key={user.id} className="px-5 py-4">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-700 ring-1 ring-slate-200">
                {ROLE_LABELS[user.role]}
              </span>
              {user.specialtyNames.length > 0 ? (
                <span className="text-slate-500">التخصصات: {user.specialtyNames.join("، ")}</span>
              ) : user.role === "DEPT_HEAD" ? (
                <span className="text-amber-700">غير مرتبط بأي تخصص بعد</span>
              ) : null}
            </div>

            <form action={updateAction} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <input type="hidden" name="userId" value={user.id} />
              <Field label="الاسم">
                <Input name="name" defaultValue={user.name} required maxLength={120} />
              </Field>
              <Field label="البريد الإلكتروني">
                <Input name="email" type="email" defaultValue={user.email} required />
              </Field>
              <Field label="كلمة مرور جديدة" hint="اتركها فارغة لعدم التغيير">
                <Input name="password" type="password" minLength={6} placeholder="••••••" />
              </Field>
              <label className="flex items-center gap-2 pb-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" name="isActive" defaultChecked={user.isActive} />
                حساب مُفعّل
              </label>
              <Button type="submit" variant="secondary" disabled={updatePending}>
                حفظ التعديلات
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </Card>
  );
}
