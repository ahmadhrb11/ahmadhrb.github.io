"use client";

/** عناصر تحكم صغيرة مشتركة بين أقسام الصفحة التفاعلية */

/** ألوان ثابتة لحدود PID تتكرر في المنزلقات والمخططات */
export const TERM_COLORS = {
  p: "#d18f00",
  i: "#2a78d6",
  d: "#4a3aa7",
  output: "#2a78d6",
  setpoint: "#52514e",
  control: "#0f172a",
  ghost: "#898781",
};

interface SliderProps {
  label: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  color?: string;
  hint?: string;
  suffix?: string;
}

export function Slider({ label, value, min, max, step, onChange, color = "#2a78d6", hint, suffix }: SliderProps) {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-slate-800">{label}</span>
        <span className="flex items-center gap-1">
          <input
            type="number"
            dir="ltr"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v)) onChange(v);
            }}
            className="w-20 rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-center font-mono text-sm tabular-nums focus:border-sky-500 focus:outline-none"
          />
          {suffix && <span className="text-xs text-slate-500">{suffix}</span>}
        </span>
      </span>
      <input
        type="range"
        dir="ltr"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => onChange(+parseFloat(e.target.value).toFixed(decimals))}
        className="mt-1.5 w-full"
        style={{ accentColor: color }}
      />
      {hint && <span className="block text-xs leading-5 text-slate-500">{hint}</span>}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-sky-600"
      />
      <span>
        <span className="font-semibold text-slate-800">{label}</span>
        {hint && <span className="block text-xs leading-5 text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>{children}</div>;
}

export function Metric({
  label,
  value,
  unit,
  good,
  title,
}: {
  label: string;
  value: number | null;
  unit: string;
  good?: boolean | null;
  title?: string;
}) {
  const tone =
    good === true ? "text-emerald-700" : good === false ? "text-rose-700" : "text-slate-900";
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2" title={title}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono text-lg font-bold tabular-nums ${tone}`} dir="ltr">
        {value === null ? "—" : value < 10 ? value.toFixed(2) : value.toFixed(1)}
        <span className="ms-1 font-sans text-xs font-normal text-slate-500">{value === null ? "" : unit}</span>
      </div>
    </div>
  );
}
