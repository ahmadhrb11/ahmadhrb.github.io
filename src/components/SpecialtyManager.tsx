"use client";

/** إدارة التخصصات وربط كل تخصص برئيس قسم — للأدمن فقط */
import { useActionState } from "react";
import { createSpecialtyAction, deleteSpecialtyAction, updateSpecialtyAction } from "@/actions/settings";
import { Alert, Button, Card, CardHeader, Field, Input, Select } from "@/components/ui";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: false };

type Head = { id: string; name: string };
type SpecialtyRow = {
  id: string;
  name: string;
  isActive: boolean;
  headId: string | null;
  requestCount: number;
};

export function SpecialtyManager({
  specialties,
  heads,
}: {
  specialties: SpecialtyRow[];
  heads: Head[];
}) {
  const [createState, createAction, createPending] = useActionState(createSpecialtyAction, initialState);
  const [updateState, updateAction, updatePending] = useActionState(updateSpecialtyAction, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteSpecialtyAction, initialState);

  return (
    <Card>
      <CardHeader
        title="التخصصات وربطها برؤساء الأقسام"
        subtitle="التخصصات هنا هي نفسها الظاهرة في قائمة نموذج تقديم الطلب. عند الموافقة على طلب يُحوَّل تلقائيًا لرئيس القسم المرتبط بتخصص المتدرب."
      />

      {/* إضافة تخصص جديد */}
      <form action={createAction} className="grid grid-cols-1 items-end gap-3 border-b border-slate-200 px-5 py-4 sm:grid-cols-3">
        <Field label="اسم التخصص الجديد" error={createState.fieldErrors?.name}>
          <Input name="name" required maxLength={80} placeholder="مثال: تقنية معلومات" />
        </Field>
        <Field label="رئيس القسم (اختياري)">
          <Select name="headId" defaultValue="">
            <option value="">— بدون ربط —</option>
            {heads.map((head) => (
              <option key={head.id} value={head.id}>
                {head.name}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" disabled={createPending}>
          {createPending ? "جارٍ الإضافة..." : "إضافة تخصص"}
        </Button>
        {createState.message ? (
          <div className="sm:col-span-3">
            <Alert tone={createState.ok ? "success" : "error"}>{createState.message}</Alert>
          </div>
        ) : null}
      </form>

      {(updateState.message || deleteState.message) && (
        <div className="px-5 pt-4">
          {updateState.message ? (
            <Alert tone={updateState.ok ? "success" : "error"}>{updateState.message}</Alert>
          ) : null}
          {deleteState.message ? (
            <Alert tone={deleteState.ok ? "success" : "error"}>{deleteState.message}</Alert>
          ) : null}
        </div>
      )}

      <ul className="divide-y divide-slate-200">
        {specialties.map((specialty) => (
          <li key={specialty.id} className="px-5 py-4">
            <form action={updateAction} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
              <input type="hidden" name="specialtyId" value={specialty.id} />

              <Field label="اسم التخصص">
                <Input name="name" defaultValue={specialty.name} required maxLength={80} />
              </Field>

              <Field label="رئيس القسم المرتبط">
                <Select name="headId" defaultValue={specialty.headId ?? ""}>
                  <option value="">— بدون ربط —</option>
                  {heads.map((head) => (
                    <option key={head.id} value={head.id}>
                      {head.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <label className="flex items-center gap-2 pb-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" name="isActive" defaultChecked={specialty.isActive} />
                مُفعّل (يظهر في نموذج التقديم)
              </label>

              <div className="flex gap-2">
                <Button type="submit" variant="secondary" disabled={updatePending} className="flex-1">
                  حفظ
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  formAction={deleteAction}
                  disabled={deletePending || specialty.requestCount > 0}
                  title={
                    specialty.requestCount > 0
                      ? `لا يمكن الحذف لوجود ${specialty.requestCount} طلب مرتبط`
                      : "حذف التخصص"
                  }
                >
                  حذف
                </Button>
              </div>
            </form>
            <p className="mt-2 text-xs text-slate-500">عدد الطلبات المرتبطة: {specialty.requestCount}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
