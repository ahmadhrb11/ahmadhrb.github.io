/**
 * فلاتر جدول الطلبات — نموذج GET بسيط يعمل عبر searchParams،
 * فلا يحتاج حالة في المتصفح ويبقى الرابط قابلًا للمشاركة.
 */
import Link from "next/link";
import { Button, Input, Select } from "@/components/ui";
import { STATUS_LABELS, TYPE_LABELS } from "@/lib/constants";

export function RequestFilters({
  action,
  specialties,
  current,
}: {
  action: string;
  specialties: { id: string; name: string }[];
  current: { status?: string; type?: string; specialtyId?: string; q?: string };
}) {
  return (
    <form action={action} method="get" className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-5">
      <Select name="status" defaultValue={current.status ?? ""} aria-label="الحالة">
        <option value="">كل الحالات</option>
        {(Object.keys(STATUS_LABELS) as (keyof typeof STATUS_LABELS)[]).map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </Select>

      <Select name="type" defaultValue={current.type ?? ""} aria-label="النوع">
        <option value="">كل الأنواع</option>
        {(Object.keys(TYPE_LABELS) as (keyof typeof TYPE_LABELS)[]).map((type) => (
          <option key={type} value={type}>
            {TYPE_LABELS[type]}
          </option>
        ))}
      </Select>

      <Select name="specialtyId" defaultValue={current.specialtyId ?? ""} aria-label="التخصص">
        <option value="">كل التخصصات</option>
        {specialties.map((specialty) => (
          <option key={specialty.id} value={specialty.id}>
            {specialty.name}
          </option>
        ))}
      </Select>

      <Input name="q" defaultValue={current.q ?? ""} placeholder="بحث بالاسم أو الرقم التدريبي" aria-label="بحث" />

      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          تطبيق
        </Button>
        <Link
          href={action}
          className="inline-flex flex-1 items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
        >
          إعادة تعيين
        </Link>
      </div>
    </form>
  );
}
