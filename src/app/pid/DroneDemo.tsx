"use client";

/**
 * عرض حيّ في الزمن الحقيقي: طائرة مسيّرة تحافظ على ارتفاعها بمتحكم PID.
 * المستخدم يحدد الارتفاع المطلوب بالنقر، ويضيف هبّات ريح أو حمولة،
 * ويغيّر المعاملات أثناء الطيران ليرى أثرها مباشرة.
 */
import { useEffect, useRef, useState } from "react";
import { Chart } from "./Chart";
import { Card, Slider, TERM_COLORS } from "./controls";

const G = 9.81;
const DRAG = 0.6;
const U_MAX = 30; // أقصى قوة دفع (نيوتن)
const H_MAX = 20; // ارتفاع منطقة الطيران (متر)
const HISTORY_SECONDS = 15;
const SAMPLE_EVERY = 1 / 30;
const PHYSICS_DT = 1 / 240;

interface Gains {
  kp: number;
  ki: number;
  kd: number;
}

interface World {
  t: number;
  h: number;
  v: number;
  u: number;
  integral: number;
  prevH: number;
  target: number;
  mass: number;
  lastSample: number;
  hist: { t: number[]; h: number[]; target: number[]; u: number[] };
}

interface View {
  t: number;
  h: number;
  u: number;
  target: number;
  mass: number;
  hist: World["hist"];
}

function newWorld(): World {
  return {
    t: 0,
    h: 0,
    v: 0,
    u: 0,
    integral: 0,
    prevH: 0,
    target: 8,
    mass: 1,
    lastSample: -1,
    hist: { t: [], h: [], target: [], u: [] },
  };
}

function snapshot(w: World): View {
  return {
    t: w.t,
    h: w.h,
    u: w.u,
    target: w.target,
    mass: w.mass,
    hist: { t: [...w.hist.t], h: [...w.hist.h], target: [...w.hist.target], u: [...w.hist.u] },
  };
}

/** خطوة فيزيائية واحدة + خطوة تحكم */
function step(w: World, g: Gains, dt: number) {
  const error = w.target - w.h;
  const dMeas = -(w.h - w.prevH) / dt;
  w.prevH = w.h;
  const unclamped = g.kp * error + g.ki * (w.integral + error * dt) + g.kd * dMeas;
  // منع الإشباع التكاملي: لا نُراكم التكامل إذا كان المحرك مشبعًا في اتجاه الخطأ نفسه
  if (!((unclamped > U_MAX && error > 0) || (unclamped < 0 && error < 0))) w.integral += error * dt;
  const u = Math.min(U_MAX, Math.max(0, g.kp * error + g.ki * w.integral + g.kd * dMeas));
  w.u = u;

  const a = u / w.mass - G - DRAG * w.v;
  w.v += a * dt;
  w.h += w.v * dt;
  if (w.h <= 0) {
    w.h = 0;
    if (w.v < 0) w.v = 0;
  }
  if (w.h > H_MAX + 3) {
    w.h = H_MAX + 3;
    w.v = Math.min(w.v, 0);
  }
  w.t += dt;

  if (w.t - w.lastSample >= SAMPLE_EVERY) {
    w.lastSample = w.t;
    const { hist } = w;
    hist.t.push(w.t);
    hist.h.push(w.h);
    hist.target.push(w.target);
    hist.u.push(u);
    while (hist.t.length && hist.t[0] < w.t - HISTORY_SECONDS) {
      hist.t.shift();
      hist.h.shift();
      hist.target.shift();
      hist.u.shift();
    }
  }
}

const VIEW_W = 400;
const VIEW_H = 320;
const GROUND = 296;
const SKY_TOP = 16;
const toY = (h: number) => GROUND - (h / H_MAX) * (GROUND - SKY_TOP);

export function DroneDemo() {
  const [gains, setGains] = useState<Gains>({ kp: 6, ki: 0, kd: 4 });
  const [running, setRunning] = useState(true);
  const [view, setView] = useState<View>(() => snapshot(newWorld()));
  const world = useRef<World>(newWorld());
  const gainsRef = useRef(gains);

  useEffect(() => {
    gainsRef.current = gains;
  }, [gains]);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      // نحدّ الفارق كي لا تقفز المحاكاة عند العودة إلى التبويب
      acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      while (acc >= PHYSICS_DT) {
        step(world.current, gainsRef.current, PHYSICS_DT);
        acc -= PHYSICS_DT;
      }
      setView(snapshot(world.current));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  function setTargetFromClick(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = ((e.clientY - rect.top) / rect.height) * VIEW_H;
    const h = ((GROUND - y) / (GROUND - SKY_TOP)) * H_MAX;
    world.current.target = Math.round(Math.min(H_MAX - 1, Math.max(1, h)) * 2) / 2;
    setView(snapshot(world.current));
  }

  function gust() {
    world.current.v -= 6;
  }

  function toggleCargo() {
    world.current.mass = world.current.mass > 1 ? 1 : 1.6;
    setView(snapshot(world.current));
  }

  function reset() {
    world.current = newWorld();
    setView(snapshot(world.current));
  }

  const { h, u, target, mass, t } = view;
  const droneY = toY(h);
  const error = target - h;
  const hoverThrust = mass * G;
  const spin = (t * 2400) % 360;
  const flame = (u / U_MAX) * 26;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(280px,340px)_1fr]">
      <Card className="space-y-4 self-start">
        <Slider
          label="Kp — التناسبي"
          value={gains.kp}
          min={0}
          max={20}
          step={0.1}
          color={TERM_COLORS.p}
          onChange={(v) => setGains((g) => ({ ...g, kp: v }))}
        />
        <Slider
          label="Ki — التكاملي"
          value={gains.ki}
          min={0}
          max={10}
          step={0.1}
          color={TERM_COLORS.i}
          onChange={(v) => setGains((g) => ({ ...g, ki: v }))}
        />
        <Slider
          label="Kd — التفاضلي"
          value={gains.kd}
          min={0}
          max={12}
          step={0.1}
          color={TERM_COLORS.d}
          onChange={(v) => setGains((g) => ({ ...g, kd: v }))}
        />

        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={gust} className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-bold text-white hover:bg-sky-700">
            💨 هبّة ريح
          </button>
          <button
            type="button"
            onClick={toggleCargo}
            className={`rounded-lg px-3 py-2 text-sm font-bold ${mass > 1 ? "bg-amber-500 text-white hover:bg-amber-600" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
          >
            📦 {mass > 1 ? "إزالة الحمولة" : "إضافة حمولة"}
          </button>
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            {running ? "⏸ إيقاف مؤقت" : "▶ استئناف"}
          </button>
          <button type="button" onClick={reset} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            ↺ إعادة الإقلاع
          </button>
        </div>

        <div className="rounded-lg bg-amber-50 p-3 text-xs leading-6 text-amber-900">
          <b>جرّب بنفسك:</b> بالقيم الحالية (Ki = 0) تحوم الطائرة <b>تحت</b> الهدف، لأن الدفع اللازم لمعادلة
          الجاذبية ({hoverThrust.toFixed(1)} نيوتن) لا يأتي إلا من خطأ موجود: الخطأ الثابت ≈ mg / Kp. ارفع Ki إلى
          نحو 3 وراقب الطائرة تصعد إلى الهدف تمامًا. ثم أضف حمولة أو اجعل Kd = 0 وانظر ماذا يحدث.
        </div>
      </Card>

      <div className="min-w-0 space-y-5">
        <Card className="p-0 sm:p-0">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_200px]">
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              className="block w-full cursor-crosshair touch-none rounded-t-xl md:rounded-s-none md:rounded-e-xl"
              style={{ background: "linear-gradient(#dbeafe, #f0f9ff)", direction: "ltr" }}
              onPointerDown={setTargetFromClick}
              role="img"
              aria-label="محاكاة طائرة مسيّرة؛ انقر لتحديد الارتفاع المطلوب"
            >
              {Array.from({ length: 5 }, (_, k) => (k + 1) * 4).map((m) => (
                <g key={m}>
                  <line x1={0} x2={VIEW_W} y1={toY(m)} y2={toY(m)} stroke="#bfdbfe" strokeDasharray="2 4" />
                  <text x={6} y={toY(m) - 3} fontSize={10} fill="#64748b">
                    {m}m
                  </text>
                </g>
              ))}
              <rect x={0} y={GROUND} width={VIEW_W} height={VIEW_H - GROUND} fill="#86b26b" />
              <line x1={0} x2={VIEW_W} y1={toY(target)} y2={toY(target)} stroke="#e34948" strokeWidth={1.5} strokeDasharray="8 5" />
              <text x={VIEW_W - 6} y={toY(target) - 5} fontSize={11} fill="#b91c1c" textAnchor="end">
                {target.toFixed(1)} m
              </text>
              <text x={VIEW_W - 50} y={toY(target) - 5} fontSize={11} fill="#b91c1c" textAnchor="end">
                الهدف
              </text>

              <g transform={`translate(${VIEW_W / 2}, ${droneY - 12})`}>
                {/* لهب الدفع يتناسب مع إشارة التحكم */}
                <path d={`M-30,8 L-26,${10 + flame} L-22,8 Z`} fill="#f59e0b" opacity={0.8} />
                <path d={`M22,8 L26,${10 + flame} L30,8 Z`} fill="#f59e0b" opacity={0.8} />
                <rect x={-34} y={2} width={68} height={5} rx={2.5} fill="#334155" />
                <rect x={-14} y={-4} width={28} height={14} rx={5} fill="#0f172a" />
                <circle cx={0} cy={3} r={3} fill="#38bdf8" />
                {[-26, 26].map((x) => (
                  <g key={x} transform={`translate(${x}, 0)`}>
                    <rect x={-1.5} y={-4} width={3} height={6} fill="#334155" />
                    <ellipse cx={0} cy={-5} rx={Math.abs(Math.cos((spin * Math.PI) / 180)) * 14 + 2} ry={1.8} fill="#64748b" />
                  </g>
                ))}
                {mass > 1 && (
                  <g>
                    <line x1={0} y1={10} x2={0} y2={18} stroke="#78350f" />
                    <rect x={-9} y={18} width={18} height={13} rx={2} fill="#d97706" />
                  </g>
                )}
              </g>
            </svg>

            <div className="grid grid-cols-3 gap-2 p-3 text-center md:grid-cols-1 md:content-center" dir="rtl">
              <Readout label="الارتفاع" value={h.toFixed(2)} unit="m" />
              <Readout label="الخطأ" value={error.toFixed(2)} unit="m" tone={Math.abs(error) < 0.1 ? "text-emerald-700" : "text-rose-700"} />
              <Readout label="قوة الدفع" value={u.toFixed(1)} unit="N" />
            </div>
          </div>
          <p className="px-4 py-2 text-xs text-slate-500">👆 انقر داخل السماء لتغيير الارتفاع المطلوب.</p>
        </Card>

        <Card>
          <h3 className="mb-2 text-sm font-bold text-slate-900">آخر {HISTORY_SECONDS} ثانية</h3>
          <Chart
            t={view.hist.t}
            tMin={Math.max(0, t - HISTORY_SECONDS)}
            tMax={Math.max(HISTORY_SECONDS, t)}
            domain={[0, H_MAX]}
            height={200}
            unit="m"
            series={[
              { label: "الهدف", data: view.hist.target, color: TERM_COLORS.setpoint, dashed: true, width: 1.5 },
              { label: "الارتفاع", data: view.hist.h, color: TERM_COLORS.output, width: 2.5 },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}

function Readout({ label, value, unit, tone = "text-slate-900" }: { label: string; value: string; unit: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`font-mono text-lg font-bold tabular-nums ${tone}`} dir="ltr">
        {value}
        <span className="ms-1 text-xs font-normal text-slate-500">{unit}</span>
      </div>
    </div>
  );
}
