import Link from "next/link";
import { PERIODS, type PeriodKey } from "@/lib/analytics";

/**
 * فلتر الفترة — صف واحد أعلى اللوحة يحكم كل ما تحته،
 * ويعمل بروابط بسيطة فلا يحتاج جافاسكربت في المتصفح.
 */
export function PeriodFilter({ current }: { current: PeriodKey }) {
  return (
    <nav aria-label="فلتر الفترة" className="flex flex-wrap items-center gap-1 rounded-lg bg-white p-1 ring-1 ring-slate-200">
      {(Object.keys(PERIODS) as PeriodKey[]).map((key) => {
        const active = key === current;
        return (
          <Link
            key={key}
            href={`/admin/dashboard?period=${key}`}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
              active ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {PERIODS[key]}
          </Link>
        );
      })}
    </nav>
  );
}
