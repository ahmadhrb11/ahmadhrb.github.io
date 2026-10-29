"use client";

/**
 * مخطط خطي خفيف بـ SVG لعرض الاستجابات الزمنية.
 * يقيس عرض الحاوية ليرسم بدقة البكسل، ويعرض خطًا عموديًا وقيمًا عند المرور بالمؤشر.
 * المحور الزمني يجري دائمًا من اليسار لليمين حتى داخل صفحة RTL.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface Series {
  label: string;
  data: number[];
  color: string;
  dashed?: boolean;
  width?: number;
  opacity?: number;
  /** إخفاء السلسلة من وسيلة الإيضاح وقراءة المؤشر */
  hideInLegend?: boolean;
}

interface ChartProps {
  t: number[];
  series: Series[];
  height?: number;
  unit?: string;
  /** حدود المحور الرأسي؛ إن لم تُحدد تُحسب تلقائيًا */
  domain?: [number, number];
  /** قصّ القيم المتطرفة إلى هذا النطاق عند الحساب التلقائي */
  clamp?: [number, number];
  markers?: { t: number; label: string }[];
  /** أقصى زمن للمحور الأفقي (افتراضيًا آخر قيمة في t) */
  tMax?: number;
  tMin?: number;
}

const MAX_POINTS = 700;
const PAD = { top: 12, right: 14, bottom: 28, left: 48 };

function niceTicks(min: number, max: number, count: number) {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => span / s <= count) ?? raw;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) ticks.push(+v.toFixed(10));
  return ticks;
}

function fmt(v: number) {
  const a = Math.abs(v);
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

export function Chart({ t, series, height = 240, unit, domain, clamp, markers, tMax, tMin }: ChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  const clipId = "clip" + useId().replace(/[^a-zA-Z0-9_-]/g, "");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(260, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const x0 = tMin ?? t[0] ?? 0;
  const x1 = tMax ?? t[t.length - 1] ?? 1;

  const [yMin, yMax] = useMemo(() => {
    if (domain) return domain;
    let lo = Infinity;
    let hi = -Infinity;
    for (const s of series) {
      for (const v of s.data) {
        const c = clamp ? Math.min(clamp[1], Math.max(clamp[0], v)) : v;
        if (c < lo) lo = c;
        if (c > hi) hi = c;
      }
    }
    if (!Number.isFinite(lo)) return [0, 1];
    if (hi - lo < 1e-6) {
      lo -= 1;
      hi += 1;
    }
    const pad = (hi - lo) * 0.08;
    return [lo - pad, hi + pad];
  }, [series, domain, clamp]);

  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const sx = (v: number) => PAD.left + ((v - x0) / (x1 - x0 || 1)) * innerW;
  const sy = (v: number) => {
    const c = Math.min(yMax, Math.max(yMin, v));
    return PAD.top + (1 - (c - yMin) / (yMax - yMin)) * innerH;
  };

  const stride = Math.max(1, Math.floor(t.length / MAX_POINTS));
  const paths = series.map((s) => {
    let d = "";
    for (let k = 0; k < s.data.length; k += stride) {
      d += `${k === 0 ? "M" : "L"}${sx(t[k]).toFixed(1)},${sy(s.data[k]).toFixed(1)}`;
    }
    const last = s.data.length - 1;
    if (last > 0 && last % stride !== 0) d += `L${sx(t[last]).toFixed(1)},${sy(s.data[last]).toFixed(1)}`;
    return d;
  });

  const yTicks = niceTicks(yMin, yMax, Math.max(3, Math.round(innerH / 45)));
  const xTicks = niceTicks(x0, x1, Math.max(3, Math.round(innerW / 80)));

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (t.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const tv = x0 + ((px - PAD.left) / innerW) * (x1 - x0);
    // بحث ثنائي عن أقرب عيّنة زمنية
    let lo = 0;
    let hi = t.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (t[mid] < tv) lo = mid + 1;
      else hi = mid;
    }
    setHover(tv < x0 || tv > x1 ? null : lo);
  }

  const hx = hover !== null ? sx(t[hover]) : 0;
  const legend = series.filter((s) => !s.hideInLegend);

  return (
    <div ref={ref} dir="ltr" className="relative w-full select-none">
      <svg
        width={width}
        height={height}
        className="block touch-none"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
      >
        {yTicks.map((v) => (
          <g key={`y${v}`}>
            <line x1={PAD.left} x2={width - PAD.right} y1={sy(v)} y2={sy(v)} stroke="#e8e7e1" />
            <text x={PAD.left - 6} y={sy(v)} dy="0.32em" textAnchor="end" fontSize={11} fill="#898781">
              {fmt(v)}
            </text>
          </g>
        ))}
        {xTicks.map((v) => (
          <text key={`x${v}`} x={sx(v)} y={height - 8} textAnchor="middle" fontSize={11} fill="#898781">
            {fmt(v)}s
          </text>
        ))}
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + innerH} stroke="#c3c2b7" />
        <line
          x1={PAD.left}
          x2={width - PAD.right}
          y1={PAD.top + innerH}
          y2={PAD.top + innerH}
          stroke="#c3c2b7"
        />
        {markers?.map((m) => (
          <g key={m.label}>
            <line
              x1={sx(m.t)}
              x2={sx(m.t)}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="#eda100"
              strokeDasharray="3 3"
            />
            <text x={sx(m.t) + 4} y={PAD.top + 10} fontSize={10} fill="#a36f00">
              {m.label}
            </text>
          </g>
        ))}
        <clipPath id={clipId}>
          <rect x={PAD.left} y={PAD.top - 2} width={innerW} height={innerH + 4} />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          {series.map((s, idx) => (
            <path
              key={s.label}
              d={paths[idx]}
              fill="none"
              stroke={s.color}
              strokeWidth={s.width ?? 2}
              strokeDasharray={s.dashed ? "6 4" : undefined}
              strokeOpacity={s.opacity ?? 1}
              strokeLinejoin="round"
            />
          ))}
        </g>
        {hover !== null && (
          <g pointerEvents="none">
            <line x1={hx} x2={hx} y1={PAD.top} y2={PAD.top + innerH} stroke="#52514e" strokeOpacity={0.4} />
            {legend.map((s) =>
              s.data[hover] !== undefined ? (
                <circle key={s.label} cx={hx} cy={sy(s.data[hover])} r={3.5} fill={s.color} stroke="#fff" />
              ) : null,
            )}
          </g>
        )}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 rounded-md border border-slate-200 bg-white/95 px-2.5 py-1.5 text-xs shadow-sm"
          style={hx > width / 2 ? { left: PAD.left + 6 } : { right: PAD.right + 6 }}
        >
          <div className="mb-0.5 font-semibold text-slate-500">t = {t[hover].toFixed(2)} s</div>
          {legend.map((s) =>
            s.data[hover] !== undefined ? (
              <div key={s.label} className="flex items-center gap-1.5 text-slate-700">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                <span dir="rtl">{s.label}</span>
                <span className="ms-auto ps-3 font-mono tabular-nums">
                  {fmt(s.data[hover])}
                </span>
              </div>
            ) : null,
          )}
        </div>
      )}

      <div dir="rtl" className="mt-1 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-slate-600">
        {legend.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <svg width="18" height="6" aria-hidden>
              <line
                x1="0"
                x2="18"
                y1="3"
                y2="3"
                stroke={s.color}
                strokeWidth={2.5}
                strokeDasharray={s.dashed ? "4 3" : undefined}
                strokeOpacity={s.opacity ?? 1}
              />
            </svg>
            {s.label}
          </span>
        ))}
        {unit && <span className="ms-auto text-slate-400">الوحدة: {unit}</span>}
      </div>
    </div>
  );
}
