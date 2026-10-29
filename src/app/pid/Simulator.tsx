"use client";

/**
 * المختبر الرئيسي: اختيار النظام، ضبط Kp وKi وKd، تشغيل أمثلة جاهزة،
 * ومشاهدة الاستجابة ومكوّنات إشارة التحكم ومؤشرات الأداء فورًا.
 */
import { useMemo, useState } from "react";
import { Chart, type Series } from "./Chart";
import { Card, Metric, Slider, TERM_COLORS, Toggle } from "./controls";
import {
  CHALLENGES,
  LESSONS,
  PLANTS,
  createPid,
  simulate,
  type Gains,
  type Lesson,
  type PlantId,
  type SimResult,
} from "./sim";

interface Settings {
  plant: PlantId;
  gains: Gains;
  setpoint: number;
  antiWindup: boolean;
  derivOnMeasurement: boolean;
  dFilter: number;
  disturbance: boolean;
  noise: boolean;
}

function defaultsFor(plant: PlantId): Settings {
  const def = PLANTS[plant];
  return {
    plant,
    gains: { ...def.defaults },
    setpoint: def.setpoint,
    antiWindup: true,
    derivOnMeasurement: true,
    dFilter: 0,
    disturbance: false,
    noise: false,
  };
}

function run(s: Settings, overrides?: Partial<Settings>): SimResult {
  const cfg = { ...s, ...overrides };
  const def = PLANTS[cfg.plant];
  const pid = createPid({
    ...cfg.gains,
    uMin: def.uMin,
    uMax: def.uMax,
    antiWindup: cfg.antiWindup,
    derivOnMeasurement: cfg.derivOnMeasurement,
    dFilter: cfg.dFilter,
  });
  return simulate(def, pid, {
    setpoint: cfg.setpoint,
    stepTime: def.duration * 0.03,
    disturbance: cfg.disturbance,
    noise: cfg.noise,
  });
}

export function Simulator() {
  const [s, setS] = useState<Settings>(() => defaultsFor("motor"));
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [ghost, setGhost] = useState<{ result: SimResult; label: string; plant: PlantId } | null>(null);
  const [showTerms, setShowTerms] = useState(true);

  const def = PLANTS[s.plant];
  const result = useMemo(() => run(s), [s]);
  // التحدي يُقاس دائمًا بظروف ثابتة (مع الاضطراب وبلا ضوضاء) كي تكون النتيجة عادلة
  const challengeResult = useMemo(() => run(s, { disturbance: true, noise: false }), [s]);
  const rules = CHALLENGES[s.plant];
  const passed = rules.map((r) => {
    const v = challengeResult.metrics[r.metric];
    return { ...r, value: v, ok: v !== null && v <= r.max };
  });
  const allPassed = passed.every((p) => p.ok);

  const update = (patch: Partial<Settings>) => setS((prev) => ({ ...prev, ...patch }));
  const setGain = (k: keyof Gains, v: number) => update({ gains: { ...s.gains, [k]: v } });

  function choosePlant(id: PlantId) {
    setS(defaultsFor(id));
    setLesson(null);
  }

  function applyLesson(l: Lesson) {
    const base = defaultsFor(l.plant);
    setS({
      ...base,
      gains: { ...l.gains },
      setpoint: l.setpoint ?? base.setpoint,
      antiWindup: l.antiWindup,
      derivOnMeasurement: l.derivOnMeasurement,
      dFilter: l.dFilter,
      disturbance: l.disturbance,
      noise: l.noise,
    });
    setLesson(l);
    setGhost(null);
  }

  const ghostValid = ghost && ghost.plant === s.plant ? ghost : null;
  const outputSeries: Series[] = [
    ...(ghostValid
      ? [{ label: `المقارنة: ${ghostValid.label}`, data: ghostValid.result.y, color: TERM_COLORS.ghost, width: 2, opacity: 0.55 }]
      : []),
    ...(s.noise
      ? [{ label: "القياس (مع الضوضاء)", data: result.measured, color: "#9cc3ee", width: 1 }]
      : []),
    { label: "الهدف (Setpoint)", data: result.sp, color: TERM_COLORS.setpoint, dashed: true, width: 1.5 },
    { label: `${def.outputLabel} الفعلية`, data: result.y, color: TERM_COLORS.output, width: 2.5 },
  ];

  const span = def.uMax - def.uMin;
  const controlSeries: Series[] = showTerms
    ? [
        { label: "حد P", data: result.p, color: TERM_COLORS.p, width: 1.5 },
        { label: "حد I", data: result.i, color: TERM_COLORS.i, width: 1.5 },
        { label: "حد D", data: result.d, color: TERM_COLORS.d, width: 1.5 },
        { label: `${def.controlLabel} الفعلية (بعد الإشباع)`, data: result.u, color: TERM_COLORS.control, width: 2.5 },
      ]
    : [{ label: `${def.controlLabel} الفعلية (بعد الإشباع)`, data: result.u, color: TERM_COLORS.control, width: 2.5 }];

  const markers = result.disturbanceTime !== null ? [{ t: result.disturbanceTime, label: "اضطراب" }] : [];
  const m = result.metrics;

  return (
    <div className="space-y-5">
      {/* الأمثلة الجاهزة */}
      <Card>
        <h3 className="text-base font-bold text-slate-900">أمثلة جاهزة — اضغط على أي مثال لتطبيقه فورًا</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {LESSONS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => applyLesson(l)}
              className={`rounded-lg border px-3 py-2 text-start text-sm font-semibold transition ${
                lesson?.id === l.id
                  ? "border-sky-500 bg-sky-50 text-sky-800"
                  : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-slate-50"
              }`}
            >
              {l.title}
              <span className="mt-0.5 block text-xs font-normal text-slate-500">
                {PLANTS[l.plant].icon} {PLANTS[l.plant].name}
              </span>
            </button>
          ))}
        </div>
        {lesson && (
          <div className="mt-3 rounded-lg border-s-4 border-sky-500 bg-sky-50 p-3 text-sm leading-7 text-slate-700">
            <span className="font-bold text-sky-800">ماذا تلاحظ؟ </span>
            {lesson.lesson}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setGhost({ result, label: lesson.title, plant: s.plant })}
                className="text-xs font-bold text-sky-700 hover:underline"
              >
                📌 ثبّت هذه النتيجة ثم غيّر المعاملات للمقارنة
              </button>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(280px,340px)_1fr]">
        {/* لوحة الضبط */}
        <Card className="space-y-5 self-start">
          <div>
            <div className="text-sm font-bold text-slate-900">النظام المراد التحكم فيه</div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {(Object.keys(PLANTS) as PlantId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => choosePlant(id)}
                  className={`rounded-lg border px-1 py-2 text-xs font-semibold ${
                    s.plant === id
                      ? "border-sky-500 bg-sky-50 text-sky-800"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-lg">{PLANTS[id].icon}</span>
                  {PLANTS[id].name}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-6 text-slate-500">{def.description}</p>
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-4">
            <Slider
              label={<>Kp — التناسبي</>}
              value={s.gains.kp}
              min={0}
              max={def.gainRanges.kp[0]}
              step={def.gainRanges.kp[1]}
              onChange={(v) => setGain("kp", v)}
              color={TERM_COLORS.p}
              hint="يدفع بقوة تتناسب مع حجم الخطأ الآن."
            />
            <Slider
              label={<>Ki — التكاملي</>}
              value={s.gains.ki}
              min={0}
              max={def.gainRanges.ki[0]}
              step={def.gainRanges.ki[1]}
              onChange={(v) => setGain("ki", v)}
              color={TERM_COLORS.i}
              hint="يجمع الخطأ الماضي ليُلغي الخطأ الثابت."
            />
            <Slider
              label={<>Kd — التفاضلي</>}
              value={s.gains.kd}
              min={0}
              max={def.gainRanges.kd[0]}
              step={def.gainRanges.kd[1]}
              onChange={(v) => setGain("kd", v)}
              color={TERM_COLORS.d}
              hint="يتنبأ بالمستقبل من سرعة تغيّر الخطأ فيُخمد التذبذب."
            />
            <Slider
              label="القيمة المطلوبة (الهدف)"
              value={s.setpoint}
              min={def.setpointRange[0]}
              max={def.setpointRange[1]}
              step={def.setpointRange[2]}
              onChange={(v) => update({ setpoint: v })}
              suffix={def.unit}
              color="#52514e"
            />
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <Toggle
              checked={s.disturbance}
              onChange={(v) => update({ disturbance: v })}
              label={`اضطراب خارجي: ${def.disturbanceLabel}`}
              hint="يبدأ عند 60% من زمن المحاكاة."
            />
            <Toggle
              checked={s.noise}
              onChange={(v) => update({ noise: v })}
              label="ضوضاء في الحساس"
              hint={`قياس عشوائي بانحراف ±${def.noise} ${def.unit}`}
            />
            <Toggle
              checked={s.antiWindup}
              onChange={(v) => update({ antiWindup: v })}
              label="منع الإشباع التكاملي (Anti-windup)"
              hint="يوقف تراكم التكامل حين يصل المشغّل إلى حدّه."
            />
            <Toggle
              checked={s.derivOnMeasurement}
              onChange={(v) => update({ derivOnMeasurement: v })}
              label="المشتقة على القياس"
              hint="يمنع النبضة الحادة عند تغيير الهدف فجأة."
            />
            <Slider
              label="ترشيح المشتقة"
              value={s.dFilter}
              min={0}
              max={s.plant === "motor" ? 0.1 : 2}
              step={s.plant === "motor" ? 0.002 : 0.05}
              onChange={(v) => update({ dFilter: v })}
              suffix="ث"
              color={TERM_COLORS.d}
              hint="مرشح تمرير منخفض يُنعّم حد D ويقلل أثر الضوضاء."
            />
          </div>

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setGhost({ result, label: `Kp=${s.gains.kp}, Ki=${s.gains.ki}, Kd=${s.gains.kd}`, plant: s.plant })}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700"
            >
              📌 ثبّت للمقارنة
            </button>
            {ghostValid && (
              <button
                type="button"
                onClick={() => setGhost(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                إزالة المقارنة
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setS(defaultsFor(s.plant));
                setLesson(null);
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              ↺ القيم الافتراضية
            </button>
          </div>
        </Card>

        {/* المخططات والنتائج */}
        <div className="min-w-0 space-y-5">
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                استجابة النظام: {def.outputLabel} ({def.unit})
              </h3>
            </div>
            {result.error && (
              <div className="mb-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">⚠️ {result.error}</div>
            )}
            <Chart t={result.t} series={outputSeries} height={260} unit={def.unit} markers={markers} />
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
              <Metric label="زمن الصعود (10→90%)" value={m.riseTime} unit="ث" />
              <Metric label="التجاوز الأقصى" value={m.overshoot} unit="%" />
              <Metric label="زمن الاستقرار (±2%)" value={m.settlingTime} unit="ث" />
              <Metric label="الخطأ الثابت" value={m.steadyStateError} unit="%" />
              <Metric label="أقصى انحراف بعد الاضطراب" value={m.disturbanceDip} unit={def.unit} />
            </div>
          </Card>

          <Card>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                إشارة التحكم: {def.controlLabel} ({def.controlUnit})
              </h3>
              <Toggle checked={showTerms} onChange={setShowTerms} label="إظهار مكوّنات P وI وD" />
            </div>
            <Chart
              t={result.t}
              series={controlSeries}
              height={220}
              unit={def.controlUnit}
              clamp={[def.uMin - span * 0.6, def.uMax + span * 0.6]}
              markers={markers}
            />
            <p className="mt-2 text-xs leading-6 text-slate-500">
              مجموع الحدود الثلاثة P + I + D هو ما يطلبه المتحكم، لكن المشغّل محدود فيزيائيًا بين {def.uMin} و
              {def.uMax} {def.controlUnit}، لذا يُقصّ الطلب (الإشباع) فيظهر الخط الأسود مسطّحًا عند الحدّين.
            </p>
          </Card>

          <Card className={allPassed ? "border-emerald-300 bg-emerald-50/40" : ""}>
            <h3 className="text-sm font-bold text-slate-900">
              🏆 تحدّي {def.name}: اضبط المعاملات لتحقيق المواصفات التالية
            </h3>
            <p className="mt-1 text-xs text-slate-500">يُقاس التحدي مع تفعيل الاضطراب وبدون ضوضاء، بالهدف الحالي.</p>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {passed.map((p) => (
                <li
                  key={p.metric}
                  className={`rounded-lg px-3 py-2 text-sm ${p.ok ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-700"}`}
                >
                  <span className="me-1">{p.ok ? "✅" : "⬜"}</span>
                  {p.label} ≤ {p.max} {p.unit}
                  <span className="block font-mono text-xs opacity-80" dir="ltr">
                    {p.value === null ? "—" : `${p.value.toFixed(2)} ${p.unit}`}
                  </span>
                </li>
              ))}
            </ul>
            {allPassed && (
              <p className="mt-3 text-sm font-bold text-emerald-800">
                أحسنت! 🎉 لقد ضبطت المتحكم بنجاح. جرّب الآن تحدّي نظام آخر.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
