"use client";

/**
 * مختبر الكود: يكتب المتعلم دالة التحكم بنفسه بلغة JavaScript
 * ثم يشغّلها على أحد الأنظمة ويرى النتيجة. الكود يُنفَّذ داخل متصفحه فقط.
 */
import { useState } from "react";
import { Chart } from "./Chart";
import { Card, Metric, TERM_COLORS } from "./controls";
import { PLANTS, simulate, type Controller, type PlantId, type SimResult } from "./sim";

const TEMPLATES: { id: string; label: string; code: string }[] = [
  {
    id: "pid",
    label: "PID كامل",
    code: `// تُستدعى هذه الدالة في كل خطوة زمنية
// error: الخطأ = الهدف − القياس
// dt: الخطوة الزمنية بالثواني
// s: كائن تحفظ فيه ما تشاء بين الاستدعاءات (مثل التكامل والخطأ السابق)
function control(error, dt, s) {
  const Kp = 0.5, Ki = 0.3, Kd = 0.04;

  s.integral = (s.integral ?? 0) + error * dt;              // ∫ e dt
  const derivative = s.prev === undefined ? 0
                   : (error - s.prev) / dt;                  // de/dt
  s.prev = error;

  return Kp * error + Ki * s.integral + Kd * derivative;
}`,
  },
  {
    id: "p",
    label: "P فقط",
    code: `function control(error, dt, s) {
  const Kp = 0.5;
  return Kp * error;
}`,
  },
  {
    id: "bang",
    label: "تشغيل/إطفاء (Bang-Bang)",
    code: `// أبسط متحكم ممكن: أقصى قوة في اتجاه الهدف
// قارنه بالـ PID ولاحظ التذبذب المستمر
function control(error, dt, s, ctx) {
  return error > 0 ? ctx.uMax : ctx.uMin;
}`,
  },
  {
    id: "pid-aw",
    label: "PID مع منع الإشباع وترشيح",
    code: `// نسخة احترافية: مشتقة على القياس + ترشيح + منع الإشباع التكاملي
function control(error, dt, s, ctx) {
  const Kp = 1, Ki = 0.5, Kd = 0.08, Tf = 0.01;

  // المشتقة على القياس (y) بدل الخطأ لتجنّب ركلة المشتقة
  const dRaw = s.prevY === undefined ? 0 : -(ctx.y - s.prevY) / dt;
  s.prevY = ctx.y;
  s.d = (s.d ?? 0) + (dt / (Tf + dt)) * (dRaw - (s.d ?? 0));

  s.i = s.i ?? 0;
  const u = Kp * error + Ki * (s.i + error * dt) + Kd * s.d;

  // لا نراكم التكامل إذا كان المشغّل مشبعًا في اتجاه الخطأ نفسه
  const saturated = (u > ctx.uMax && error > 0) || (u < ctx.uMin && error < 0);
  if (!saturated) s.i += error * dt;

  return Kp * error + Ki * s.i + Kd * s.d;
}`,
  },
];

type UserFn = (
  error: number,
  dt: number,
  s: Record<string, unknown>,
  ctx: { y: number; setpoint: number; t: number; uMin: number; uMax: number },
) => number;

function compile(code: string): UserFn {
  // الكود يكتبه الزائر بنفسه ويُنفَّذ في متصفحه فقط — كما في أي ساحة تجارب
  const factory = new Function(
    `"use strict";\n${code}\nif (typeof control !== "function") throw new Error("لم يتم تعريف دالة باسم control");\nreturn control;`,
  );
  return factory() as UserFn;
}

export function CodeLab() {
  const [code, setCode] = useState(TEMPLATES[0].code);
  const [plant, setPlant] = useState<PlantId>("motor");
  const [disturbance, setDisturbance] = useState(true);
  const [result, setResult] = useState<SimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ranPlant, setRanPlant] = useState<PlantId>("motor");

  function runCode() {
    const def = PLANTS[plant];
    try {
      const fn = compile(code);
      const state: Record<string, unknown> = {};
      const controller: Controller = (sp, measured, dt, t) => {
        const u = Number(fn(sp - measured, dt, state, { y: measured, setpoint: sp, t, uMin: def.uMin, uMax: def.uMax }));
        return { u, p: 0, i: 0, d: 0 };
      };
      const r = simulate(def, controller, {
        setpoint: def.setpoint,
        stepTime: def.duration * 0.03,
        disturbance,
        noise: false,
      });
      setResult(r);
      setRanPlant(plant);
      setError(r.error ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    }
  }

  const def = PLANTS[ranPlant];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card className="flex min-w-0 flex-col">
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setCode(tpl.code)}
              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-sky-300 hover:bg-sky-50"
            >
              {tpl.label}
            </button>
          ))}
        </div>
        <textarea
          dir="ltr"
          wrap="off"
          spellCheck={false}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              runCode();
            }
            if (e.key === "Tab") {
              e.preventDefault();
              const el = e.currentTarget;
              const { selectionStart: a, selectionEnd: b } = el;
              setCode(code.slice(0, a) + "  " + code.slice(b));
              requestAnimationFrame(() => el.setSelectionRange(a + 2, a + 2));
            }
          }}
          className="mt-3 min-h-[340px] w-full flex-1 resize-y rounded-lg border border-slate-700 bg-slate-900 p-3 font-mono text-[13px] leading-6 text-slate-100 focus:border-sky-500 focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={plant}
            onChange={(e) => setPlant(e.target.value as PlantId)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
          >
            {(Object.keys(PLANTS) as PlantId[]).map((id) => (
              <option key={id} value={id}>
                {PLANTS[id].icon} {PLANTS[id].name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-slate-700">
            <input type="checkbox" checked={disturbance} onChange={(e) => setDisturbance(e.target.checked)} className="accent-sky-600" />
            مع اضطراب
          </label>
          <button
            type="button"
            onClick={runCode}
            className="ms-auto rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-emerald-700"
          >
            ▶ تشغيل <span className="text-xs font-normal opacity-80">(Ctrl+Enter)</span>
          </button>
        </div>
      </Card>

      <Card className="min-w-0">
        {error && (
          <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 font-mono text-sm text-rose-700" dir="auto">
            ⚠️ {error}
          </div>
        )}
        {result ? (
          <>
            <h3 className="mb-2 text-sm font-bold text-slate-900">
              {def.icon} {def.name}: {def.outputLabel} ({def.unit})
            </h3>
            <Chart
              t={result.t}
              height={220}
              unit={def.unit}
              markers={result.disturbanceTime !== null ? [{ t: result.disturbanceTime, label: "اضطراب" }] : []}
              series={[
                { label: "الهدف", data: result.sp, color: TERM_COLORS.setpoint, dashed: true, width: 1.5 },
                { label: def.outputLabel, data: result.y, color: TERM_COLORS.output, width: 2.5 },
              ]}
            />
            <h3 className="mb-2 mt-4 text-sm font-bold text-slate-900">
              {def.controlLabel} ({def.controlUnit})
            </h3>
            <Chart
              t={result.t}
              height={150}
              unit={def.controlUnit}
              series={[{ label: def.controlLabel, data: result.u, color: TERM_COLORS.control, width: 2 }]}
            />
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="زمن الصعود" value={result.metrics.riseTime} unit="ث" />
              <Metric label="التجاوز" value={result.metrics.overshoot} unit="%" />
              <Metric label="زمن الاستقرار" value={result.metrics.settlingTime} unit="ث" />
              <Metric label="الخطأ الثابت" value={result.metrics.steadyStateError} unit="%" />
            </div>
          </>
        ) : (
          !error && (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center text-sm leading-7 text-slate-500">
              <span className="text-4xl">🧪</span>
              <p className="mt-2">
                عدّل الكود ثم اضغط <b>تشغيل</b>.
                <br />
                دالتك تُستدعى آلاف المرات خلال المحاكاة، وما تُرجعه هو إشارة التحكم.
              </p>
            </div>
          )
        )}
      </Card>
    </div>
  );
}
