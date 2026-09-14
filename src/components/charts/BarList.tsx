/**
 * مخطط أعمدة أفقية لمقارنة المقدار (عدد الطلبات لكل تخصص/نوع...).
 *
 * سلسلة واحدة ⇐ لون واحد لكل الأعمدة. تدرّج اللون حسب الحجم يكرّر
 * المعلومة التي يحملها طول العمود أصلًا، فلا يُستخدم هنا.
 * القيمة تُكتب عند طرف العمود بحبر النص لا بلون العمود.
 */
import { INK, SERIES_1 } from "@/components/charts/tokens";

export type BarRow = { label: string; value: number; hint?: string };

export function BarList({
  rows,
  color = SERIES_1,
  unit = "",
  emptyMessage = "لا توجد بيانات في هذه الفترة",
}: {
  rows: BarRow[];
  color?: string;
  unit?: string;
  emptyMessage?: string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  const visible = rows.filter((row) => row.value > 0);

  if (visible.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => {
        const widthPercent = (row.value / max) * 100;
        return (
          <li key={row.label} className="grid grid-cols-[9rem_1fr_auto] items-center gap-3">
            <span className="truncate text-sm font-semibold text-slate-700" title={row.label}>
              {row.label}
            </span>

            {/* مسار العمود: خط أساس واحد، وسماكة محدودة مع هواء حوله */}
            <span className="relative block h-3.5 w-full rounded-sm" style={{ backgroundColor: INK.grid }}>
              <span
                className="absolute inset-y-0 right-0 block rounded-l-[4px]"
                style={{ width: `${Math.max(widthPercent, row.value > 0 ? 1.5 : 0)}%`, backgroundColor: color }}
                title={`${row.label}: ${row.value}${unit}`}
              />
            </span>

            <span className="whitespace-nowrap text-sm font-bold text-slate-800 [font-variant-numeric:tabular-nums]">
              {row.value}
              {unit}
              {row.hint ? <span className="mr-1 font-normal text-slate-500">{row.hint}</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
