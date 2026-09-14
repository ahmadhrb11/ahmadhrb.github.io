/**
 * شريط نسبة إلى الكل (part-to-whole) — شريط واحد مكدّس بفجوة سطح 2px
 * بين المقاطع، ومفتاح ألوان يحمل التسمية والقيمة لكل مقطع.
 *
 * التسمية داخل المقطع تُكتب فقط إن اتّسع لها فعلًا؛ وإلا يحملها المفتاح
 * والجدول، فلا يُقصّ نص أبدًا.
 */
import { inkOn } from "@/components/charts/tokens";
import { Legend } from "@/components/charts/ChartCard";

export type Share = { label: string; value: number; color: string };

export function ShareBar({ slices }: { slices: Share[] }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">لا توجد طلبات في هذه الفترة</p>;
  }

  const visible = slices.filter((slice) => slice.value > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-10 w-full overflow-hidden rounded-md" style={{ gap: 2 }}>
        {visible.map((slice) => {
          const percent = (slice.value / total) * 100;
          // النص داخل المقطع يحتاج مساحة حقيقية؛ دون ذلك يحمله المفتاح
          const fitsLabel = percent >= 12;
          return (
            <div
              key={slice.label}
              className="flex items-center justify-center first:rounded-r-[4px] last:rounded-l-[4px]"
              style={{ width: `${percent}%`, backgroundColor: slice.color }}
              title={`${slice.label}: ${slice.value} (${percent.toFixed(1)}%)`}
            >
              {fitsLabel ? (
                <span
                  className="px-1 text-xs font-bold [font-variant-numeric:tabular-nums]"
                  style={{ color: inkOn(slice.color) }}
                >
                  {percent.toFixed(0)}%
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <Legend
        items={visible.map((slice) => ({
          color: slice.color,
          label: slice.label,
          value: `${slice.value} (${((slice.value / total) * 100).toFixed(0)}%)`,
        }))}
      />
    </div>
  );
}
