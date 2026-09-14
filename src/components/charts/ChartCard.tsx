/**
 * إطار موحّد لكل مخطط: عنوان + وصف + المخطط + «عرض القيم كجدول».
 *
 * الجدول ليس زينة: هو النسخة المتاحة دائمًا من نفس الأرقام، فلا تبقى أي
 * قيمة محبوسة خلف اللون أو خلف التمرير بالفأرة.
 */
import type { ReactNode } from "react";

export function ChartCard({
  title,
  subtitle,
  children,
  tableHead,
  tableRows,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  tableHead?: string[];
  tableRows?: (string | number)[][];
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <header className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
      </header>

      <div className="px-5 py-5">{children}</div>

      {tableHead && tableRows ? (
        <details className="border-t border-slate-200">
          <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            عرض القيم كجدول
          </summary>
          <div className="overflow-x-auto px-5 pb-5">
            <table className="w-full text-right text-sm">
              <thead className="text-xs font-bold text-slate-500">
                <tr>
                  {tableHead.map((cell) => (
                    <th key={cell} className="border-b border-slate-200 px-2 py-2">
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="[font-variant-numeric:tabular-nums]">
                {tableRows.map((row, index) => (
                  <tr key={index} className="border-b border-slate-100 last:border-0">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-2 py-2 text-slate-700">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </section>
  );
}

/** مفتاح ألوان — حاضر دائمًا عند وجود سلسلتين فأكثر */
export function Legend({ items }: { items: { color: string; label: string; value?: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-xs">
          {/* الهوية يحملها المربّع الملوّن، والنص يبقى بحبر النص دائمًا */}
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span className="font-semibold text-slate-700">{item.label}</span>
          {item.value ? <span className="text-slate-500">{item.value}</span> : null}
        </li>
      ))}
    </ul>
  );
}
