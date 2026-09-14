/**
 * بطاقة مؤشر — الشكل الصحيح حين تكون «البيانات» رقمًا واحدًا.
 * (لا يُرسم مخطط بعمود واحد، ولا فطيرة بشريحتين.)
 *
 * الأرقام الكبيرة تستخدم الأرقام المتناسبة الافتراضية؛ العرض الجدولي
 * للأرقام محجوز لأعمدة الجداول التي تحتاج محاذاة رأسية.
 */
import type { ReactNode } from "react";

export function MetricTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "neutral" | "attention" | "good";
}) {
  const accent = {
    neutral: "border-slate-200",
    attention: "border-amber-300 bg-amber-50/40",
    good: "border-emerald-200 bg-emerald-50/40",
  }[tone];

  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${accent}`}>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-extrabold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

/** الرقم الذي تتصدّر به اللوحة — واحد فقط في الصفحة، بنفس خط الواجهة */
export function HeroFigure({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-5xl font-extrabold leading-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}
