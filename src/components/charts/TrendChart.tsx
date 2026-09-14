/**
 * مخطط خطي للاتجاه الأسبوعي — سلسلتان بنفس وحدة القياس (عدد طلبات)
 * على محور واحد. لا يوجد محور ثانٍ إطلاقًا.
 *
 * الزمن يسير من اليمين (الأقدم) إلى اليسار (الأحدث) اتساقًا مع اتجاه الواجهة.
 *
 * يُرسم مرّتين بلا جافاسكربت: نسخة كاملة للشاشات المتوسطة فأكبر، ونسخة
 * مضغوطة بآخر 6 أسابيع للجوال — بدل التمرير الأفقي الذي كان يخفي أحدث
 * الأسابيع (وهي أهمّها) خلف حافة الشاشة.
 */
import { INK, SERIES_1, SERIES_GREEN } from "@/components/charts/tokens";
import { Legend } from "@/components/charts/ChartCard";

export type TrendSeries = { label: string; color: string; values: number[] };

/** أقرب رقم مناسب لأعلى تدريج على المحور */
function niceMax(value: number): number {
  if (value <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(value)));
  return Math.ceil(value / step) * step;
}

function Plot({
  labels,
  series,
  width,
  height,
  labelEvery,
}: {
  labels: string[];
  series: TrendSeries[];
  width: number;
  height: number;
  labelEvery: number;
}) {
  const pad = { top: 18, right: 36, bottom: 30, left: 14 };
  const points = labels.length;
  const max = niceMax(Math.max(...series.flatMap((s) => s.values), 1));
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  // الفهرس 0 = الأقدم ⇐ أقصى اليمين
  const x = (index: number) =>
    pad.left + plotW - (points === 1 ? plotW / 2 : (index / (points - 1)) * plotW);
  const y = (value: number) => pad.top + plotH - (value / max) * plotH;

  const ticks = [0, max / 2, max];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={`اتجاه أسبوعي: ${series.map((s) => s.label).join(" و ")}`}
    >
      {/* شبكة أفقية — خطوط شعرية صلبة وتراجعية */}
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={y(tick)}
            y2={y(tick)}
            stroke={tick === 0 ? INK.axis : INK.grid}
            strokeWidth={1}
          />
          <text
            x={width - pad.right + 6}
            y={y(tick) + 4}
            fontSize={12}
            fill={INK.muted}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {Math.round(tick)}
          </text>
        </g>
      ))}

      {/* تسميات المحور الأفقي — بتباعد يمنع التزاحم */}
      {labels.map((label, index) =>
        index % labelEvery === 0 || index === points - 1 ? (
          <text
            key={label + index}
            x={x(index)}
            y={height - pad.bottom + 18}
            fontSize={12}
            fill={INK.muted}
            textAnchor="middle"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {label}
          </text>
        ) : null
      )}

      {series.map((s) => {
        const path = s.values
          .map((value, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(value)}`)
          .join(" ");
        const lastIndex = s.values.length - 1;

        return (
          <g key={s.label}>
            <path
              d={path}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* نقاط بحلقة بلون السطح لتبقى واضحة عند التقاطع */}
            {s.values.map((value, index) => (
              <circle
                key={index}
                cx={x(index)}
                cy={y(value)}
                r={value > 0 || index === lastIndex ? 4 : 0}
                fill={s.color}
                stroke={INK.surface}
                strokeWidth={2}
              >
                <title>{`${s.label} — أسبوع ${labels[index]}: ${value}`}</title>
              </circle>
            ))}
            {/* تسمية مباشرة لآخر نقطة فقط — بقية القيم يحملها المحور والجدول */}
            <text
              x={x(lastIndex)}
              y={y(s.values[lastIndex]) - 11}
              fontSize={13}
              fontWeight={700}
              fill={INK.primary}
              textAnchor="middle"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {s.values[lastIndex]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function TrendChart({
  labels,
  series,
  compactPoints = 6,
}: {
  labels: string[];
  series: TrendSeries[];
  /** عدد الأسابيع المعروضة على شاشات الجوال */
  compactPoints?: number;
}) {
  if (labels.length === 0) return null;

  const sliceFrom = Math.max(0, labels.length - compactPoints);
  const compactLabels = labels.slice(sliceFrom);
  const compactSeries = series.map((s) => ({ ...s, values: s.values.slice(sliceFrom) }));

  return (
    <div className="flex flex-col gap-4">
      <Legend items={series.map((s) => ({ color: s.color, label: s.label }))} />

      {/* الشاشات المتوسطة فأكبر: كل الأسابيع */}
      <div className="hidden sm:block">
        <Plot labels={labels} series={series} width={880} height={260} labelEvery={2} />
      </div>

      {/* الجوال: آخر أسابيع فقط، بلا تمرير أفقي */}
      <div className="sm:hidden">
        <Plot
          labels={compactLabels}
          series={compactSeries}
          width={340}
          height={220}
          labelEvery={1}
        />
        <p className="mt-2 text-center text-xs text-slate-500">
          آخر {compactLabels.length} أسابيع — الجدول أدناه يعرض الفترة كاملة
        </p>
      </div>
    </div>
  );
}

export const TREND_COLORS = { submitted: SERIES_1, completed: SERIES_GREEN };
