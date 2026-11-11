import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { Card, CardHeader } from "@/components/ui";
import { requireAnyRole } from "@/lib/guards";
import { ROLE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "حسابي" };

/** صفحة حساب الموظف — بياناته وتغيير كلمة مروره بنفسه */
export default async function AccountPage() {
  const user = await requireAnyRole(["DEPT_HEAD", "DEPUTY"]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold text-slate-900">حسابي</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="تغيير كلمة المرور"
              subtitle="تحتاج كلمة المرور الحالية للتأكيد، ثم تدخل الجديدة مرتين"
            />
            <ChangePasswordForm />
          </Card>
        </div>

        <Card>
          <CardHeader title="بيانات الحساب" subtitle="لتعديلها راجع مسؤول النظام" />
          <dl className="flex flex-col gap-4 px-5 py-4 text-sm">
            <div>
              <dt className="text-xs font-semibold text-slate-500">الاسم</dt>
              <dd className="mt-0.5 font-semibold text-slate-800">{user.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">البريد (اسم الدخول)</dt>
              {/* dir=ltr ليقرأ البريد صحيحًا، وtext-right ليبقى محاذيًا لبقية القيم */}
              <dd className="mt-0.5 text-right font-semibold text-slate-800" dir="ltr">
                {user.email}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">الدور</dt>
              <dd className="mt-0.5 font-semibold text-slate-800">{ROLE_LABELS[user.role]}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
