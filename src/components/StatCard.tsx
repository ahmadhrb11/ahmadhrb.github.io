/** بطاقة إحصائية صغيرة تُستخدم في أعلى لوحات التحكم */
import Link from "next/link";

export function StatCard({
  label,
  value,
  tone = "default",
  href,
}: {
  label: string;
  value: number;
  tone?: "default" | "alert" | "info" | "success" | "purple";
  href?: string;
}) {
  const tones = {
    default: "bg-white text-slate-800 border-slate-200",
    alert: "bg-rose-50 text-rose-800 border-rose-200",
    info: "bg-sky-50 text-sky-800 border-sky-200",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    purple: "bg-purple-50 text-purple-800 border-purple-200",
  } as const;

  const content = (
    <div className={`rounded-xl border p-4 shadow-sm transition ${tones[tone]} ${href ? "hover:shadow-md" : ""}`}>
      <p className="text-xs font-semibold opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
