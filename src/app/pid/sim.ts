/**
 * محرّك محاكاة المتحكم PID — منطق خالص بلا واجهة.
 *
 * يحتوي على: نماذج الأنظمة الفيزيائية (المصانع)، المتحكم PID بخياراته
 * التعليمية (مقاومة الإشباع التكاملي، المشتقة على القياس، ترشيح المشتقة)،
 * دالة المحاكاة، وحساب مؤشرات الأداء من الاستجابة.
 */

export type PlantId = "heater" | "motor" | "cruise";

/** نظام فيزيائي يُحدَّث خطوة بخطوة: يستقبل إشارة التحكم ويُرجع المخرج */
export interface Plant {
  /** المخرج الحالي (درجة حرارة، زاوية، سرعة...) */
  readonly y: number;
  /** تقدّم زمني بمقدار dt مع إشارة تحكم u واضطراب خارجي d */
  step(u: number, dt: number, d: number): void;
}

export interface Gains {
  kp: number;
  ki: number;
  kd: number;
}

export interface PlantDef {
  id: PlantId;
  name: string;
  icon: string;
  description: string;
  unit: string;
  outputLabel: string;
  controlLabel: string;
  controlUnit: string;
  /** حدود المشغّل الفيزيائية (إشباع) */
  uMin: number;
  uMax: number;
  /** المخرج عند البداية */
  y0: number;
  setpoint: number;
  setpointRange: [number, number, number];
  duration: number;
  /** نطاقات منزلقات المعاملات [أقصى قيمة، خطوة] */
  gainRanges: Record<keyof Gains, [number, number]>;
  defaults: Gains;
  disturbanceLabel: string;
  /** قيمة الاضطراب عند تفعيله (بوحدات معادلة النظام) */
  disturbance: number;
  /** الانحراف المعياري الافتراضي لضوضاء الحساس عند تفعيلها */
  noise: number;
  create(): Plant;
}

/* ---------------------------------------------------------------
   النماذج الفيزيائية
   --------------------------------------------------------------- */

/** سخّان (نظام من الدرجة الأولى مع تأخير زمني) */
function createHeater(): Plant {
  const ambient = 25;
  const tau = 8; // الثابت الزمني (ثانية)
  const gain = 1.5; // درجة مئوية لكل 1% قدرة في الحالة المستقرة
  const delay = 0.6; // تأخر انتقال الحرارة إلى الحساس (ثانية)
  const buffer: number[] = [];
  let y = ambient;
  return {
    get y() {
      return y;
    },
    step(u, dt, d) {
      buffer.push(u);
      const lag = Math.round(delay / dt);
      const uDelayed = buffer.length > lag ? buffer.shift()! : 0;
      y += (dt / tau) * (gain * uDelayed - (y - ambient) - d);
    },
  };
}

/** محرك كهربائي يتحكم في زاوية ذراع (نظام من الدرجة الثانية) */
function createMotor(): Plant {
  const friction = 3; // معامل الاحتكاك اللزج
  const k = 300; // تسارع زاوي لكل فولت (درجة/ث²)
  let theta = 0;
  let omega = 0;
  return {
    get y() {
      return theta;
    },
    step(u, dt, d) {
      const alpha = k * u - friction * omega - d;
      omega += alpha * dt;
      theta += omega * dt;
    },
  };
}

/** مثبّت سرعة السيارة (Cruise Control) مع مقاومة الهواء وصعود مرتفع */
function createCruise(): Plant {
  const a = 0.12; // تسارع (كم/س لكل ثانية) لكل 1% من دواسة الوقود
  const drag = 0.08; // مقاومة تتناسب مع السرعة
  let v = 0;
  return {
    get y() {
      return v;
    },
    step(u, dt, d) {
      v += dt * (a * u - drag * v - d);
      if (v < 0) v = 0;
    },
  };
}

export const PLANTS: Record<PlantId, PlantDef> = {
  heater: {
    id: "heater",
    name: "فرن / سخّان",
    icon: "🔥",
    description:
      "نظام حراري بطيء من الدرجة الأولى مع تأخير زمني بسيط. يحتاج قدرة مستمرة للحفاظ على الحرارة، لذا يترك المتحكم P وحده خطأً ثابتًا.",
    unit: "°C",
    outputLabel: "درجة الحرارة",
    controlLabel: "قدرة السخّان",
    controlUnit: "%",
    uMin: 0,
    uMax: 100,
    y0: 25,
    setpoint: 80,
    setpointRange: [30, 150, 1],
    duration: 60,
    gainRanges: { kp: [20, 0.1], ki: [5, 0.01], kd: [20, 0.1] },
    defaults: { kp: 3, ki: 0.3, kd: 0 },
    disturbanceLabel: "فتح باب الفرن (فقد حراري)",
    disturbance: 25,
    noise: 0.8,
    create: createHeater,
  },
  motor: {
    id: "motor",
    name: "محرك وذراع",
    icon: "⚙️",
    description:
      "محرك كهربائي يدير ذراعًا إلى زاوية محددة. النظام من الدرجة الثانية (له قصور ذاتي)، فيميل للتذبذب حين يكون Kp كبيرًا بلا Kd.",
    unit: "°",
    outputLabel: "زاوية الذراع",
    controlLabel: "جهد المحرك",
    controlUnit: "V",
    uMin: -12,
    uMax: 12,
    y0: 0,
    setpoint: 90,
    setpointRange: [10, 180, 1],
    duration: 6,
    gainRanges: { kp: [3, 0.01], ki: [3, 0.01], kd: [0.2, 0.002] },
    defaults: { kp: 0.5, ki: 0.3, kd: 0.04 },
    disturbanceLabel: "حمل إضافي على الذراع",
    disturbance: 150,
    noise: 0.6,
    create: createMotor,
  },
  cruise: {
    id: "cruise",
    name: "مثبّت السرعة",
    icon: "🚗",
    description:
      "سيارة تحاول الحفاظ على سرعة ثابتة. عند صعود مرتفع يظهر اضطراب يُبطئ السيارة، ويعيدها الحد التكاملي للسرعة المطلوبة.",
    unit: "كم/س",
    outputLabel: "السرعة",
    controlLabel: "دواسة الوقود",
    controlUnit: "%",
    uMin: 0,
    uMax: 100,
    y0: 0,
    setpoint: 100,
    setpointRange: [20, 140, 1],
    duration: 60,
    gainRanges: { kp: [20, 0.1], ki: [5, 0.01], kd: [10, 0.1] },
    defaults: { kp: 3, ki: 0.4, kd: 0 },
    disturbanceLabel: "صعود مرتفع",
    disturbance: 3,
    noise: 1,
    create: createCruise,
  },
};

/* ---------------------------------------------------------------
   المتحكم PID
   --------------------------------------------------------------- */

export interface PidOptions extends Gains {
  uMin: number;
  uMax: number;
  /** منع تراكم التكامل أثناء الإشباع (Clamping) */
  antiWindup: boolean;
  /** حساب المشتقة من القياس بدل الخطأ لتجنّب "ركلة المشتقة" */
  derivOnMeasurement: boolean;
  /** ثابت زمني لمرشّح تمرير منخفض على حد المشتقة (ثانية، 0 = بلا ترشيح) */
  dFilter: number;
}

export interface ControlTerms {
  u: number;
  p: number;
  i: number;
  d: number;
}

/** دالة تحكم عامة: تستقبل الهدف والقياس وتُرجع إشارة التحكم ومكوّناتها */
export type Controller = (setpoint: number, measured: number, dt: number, t: number) => ControlTerms;

export function createPid(o: PidOptions): Controller {
  let integral = 0;
  let prevError: number | null = null;
  let prevMeasured: number | null = null;
  let dFiltered = 0;

  return (setpoint, measured, dt) => {
    const error = setpoint - measured;

    const p = o.kp * error;

    let rawD = 0;
    if (o.derivOnMeasurement) {
      if (prevMeasured !== null) rawD = -(measured - prevMeasured) / dt;
    } else if (prevError !== null) {
      rawD = (error - prevError) / dt;
    }
    prevError = error;
    prevMeasured = measured;
    const alpha = o.dFilter > 0 ? dt / (o.dFilter + dt) : 1;
    dFiltered += alpha * (rawD - dFiltered);
    const d = o.kd * dFiltered;

    // نحسب التكامل المرشّح ثم نقرر قبوله حسب خيار مقاومة الإشباع
    const candidate = integral + error * dt;
    const uCandidate = p + o.ki * candidate + d;
    const saturatedHigh = uCandidate > o.uMax && error > 0;
    const saturatedLow = uCandidate < o.uMin && error < 0;
    if (!o.antiWindup || !(saturatedHigh || saturatedLow)) integral = candidate;

    const i = o.ki * integral;
    return { u: p + i + d, p, i, d };
  };
}

/* ---------------------------------------------------------------
   المحاكاة
   --------------------------------------------------------------- */

export interface SimOptions {
  setpoint: number;
  /** زمن تغيير الهدف من القيمة الابتدائية إلى الهدف */
  stepTime: number;
  disturbance: boolean;
  noise: boolean;
  dt?: number;
  /** بذرة ثابتة كي تتكرر الضوضاء نفسها بين التشغيلات فتصح المقارنة */
  seed?: number;
}

export interface SimResult {
  t: number[];
  sp: number[];
  y: number[];
  measured: number[];
  u: number[];
  p: number[];
  i: number[];
  d: number[];
  disturbanceTime: number | null;
  metrics: Metrics;
  error?: string;
}

/** مولّد أرقام شبه عشوائية قابل للتكرار (mulberry32) */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number) {
  const u1 = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rand());
}

export function simulate(def: PlantDef, controller: Controller, opts: SimOptions): SimResult {
  const dt = opts.dt ?? def.duration / 3000;
  const steps = Math.round(def.duration / dt);
  const plant = def.create();
  const rand = rng(opts.seed ?? 7);
  const disturbanceTime = opts.disturbance ? def.duration * 0.6 : null;

  const out: SimResult = {
    t: [], sp: [], y: [], measured: [], u: [], p: [], i: [], d: [],
    disturbanceTime,
    metrics: emptyMetrics(),
  };

  try {
    for (let k = 0; k <= steps; k++) {
      const t = k * dt;
      const sp = t >= opts.stepTime ? opts.setpoint : def.y0;
      const y = plant.y;
      const measured = opts.noise ? y + def.noise * gaussian(rand) : y;
      const terms = controller(sp, measured, dt, t);
      if (!Number.isFinite(terms.u)) throw new Error("أرجعت دالة التحكم قيمة غير رقمية (NaN أو ما لا نهاية)");
      const u = Math.min(def.uMax, Math.max(def.uMin, terms.u));
      const dist = disturbanceTime !== null && t >= disturbanceTime ? def.disturbance : 0;

      out.t.push(t);
      out.sp.push(sp);
      out.y.push(y);
      out.measured.push(measured);
      out.u.push(u);
      out.p.push(terms.p);
      out.i.push(terms.i);
      out.d.push(terms.d);

      plant.step(u, dt, dist);
      if (!Number.isFinite(plant.y) || Math.abs(plant.y) > 1e6) {
        throw new Error("خرج النظام عن السيطرة (عدم استقرار شديد) — خفّف المعاملات");
      }
    }
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e);
  }

  out.metrics = computeMetrics(out, def, opts);
  return out;
}

/* ---------------------------------------------------------------
   مؤشرات الأداء
   --------------------------------------------------------------- */

export interface Metrics {
  /** زمن الصعود من 10% إلى 90% من قيمة القفزة (ثانية) */
  riseTime: number | null;
  /** التجاوز الأقصى كنسبة مئوية من القفزة */
  overshoot: number | null;
  /** زمن الاستقرار ضمن نطاق ±2% (ثانية) */
  settlingTime: number | null;
  /** الخطأ في الحالة المستقرة كنسبة مئوية من الهدف */
  steadyStateError: number | null;
  /** أكبر انحراف بعد الاضطراب (بوحدة النظام) */
  disturbanceDip: number | null;
}

function emptyMetrics(): Metrics {
  return { riseTime: null, overshoot: null, settlingTime: null, steadyStateError: null, disturbanceDip: null };
}

function computeMetrics(r: SimResult, def: PlantDef, opts: SimOptions): Metrics {
  const m = emptyMetrics();
  const n = r.t.length;
  if (n < 10 || r.error) return m;

  const start = r.t.findIndex((t) => t >= opts.stepTime);
  const endT = r.disturbanceTime ?? def.duration;
  let end = r.t.findIndex((t) => t >= endT);
  if (end < 0) end = n - 1;
  if (start < 0 || end <= start + 5) return m;

  const y0 = def.y0;
  const step = opts.setpoint - y0;
  if (Math.abs(step) < 1e-9) return m;
  const norm = (y: number) => (y - y0) / step;

  // زمن الصعود
  let t10: number | null = null;
  let t90: number | null = null;
  for (let k = start; k < end; k++) {
    const v = norm(r.y[k]);
    if (t10 === null && v >= 0.1) t10 = r.t[k];
    if (t90 === null && v >= 0.9) {
      t90 = r.t[k];
      break;
    }
  }
  if (t10 !== null && t90 !== null) m.riseTime = t90 - t10;

  // التجاوز
  let peak = -Infinity;
  for (let k = start; k < end; k++) peak = Math.max(peak, norm(r.y[k]));
  m.overshoot = Math.max(0, (peak - 1) * 100);

  // زمن الاستقرار: آخر لحظة خرج فيها المخرج عن نطاق ±2%
  let lastOutside = -1;
  for (let k = start; k < end; k++) {
    if (Math.abs(norm(r.y[k]) - 1) > 0.02) lastOutside = k;
  }
  if (lastOutside < end - Math.max(5, Math.round((end - start) * 0.05))) {
    m.settlingTime = lastOutside < start ? 0 : r.t[lastOutside + 1] - opts.stepTime;
  }

  // الخطأ الثابت: متوسط آخر 10% من النافذة قبل الاضطراب
  const tail = Math.max(1, Math.round((end - start) * 0.1));
  let sum = 0;
  for (let k = end - tail; k < end; k++) sum += r.y[k];
  m.steadyStateError = (Math.abs(opts.setpoint - sum / tail) / Math.abs(step)) * 100;

  // أقصى انحراف بعد الاضطراب
  if (r.disturbanceTime !== null) {
    let dip = 0;
    for (let k = end; k < n; k++) dip = Math.max(dip, Math.abs(opts.setpoint - r.y[k]));
    m.disturbanceDip = dip;
  }
  return m;
}

/* ---------------------------------------------------------------
   الأمثلة الجاهزة (دروس)
   --------------------------------------------------------------- */

export interface Lesson {
  id: string;
  title: string;
  plant: PlantId;
  gains: Gains;
  antiWindup: boolean;
  derivOnMeasurement: boolean;
  dFilter: number;
  disturbance: boolean;
  noise: boolean;
  setpoint?: number;
  /** ما يجب أن يلاحظه المتعلم */
  lesson: string;
}

export const LESSONS: Lesson[] = [
  {
    id: "p-offset",
    title: "١. P فقط ← خطأ ثابت",
    plant: "heater",
    gains: { kp: 4, ki: 0, kd: 0 },
    antiWindup: true, derivOnMeasurement: true, dFilter: 0, disturbance: false, noise: false,
    lesson:
      "لاحظ أن الحرارة تستقر تحت الهدف. السخّان يحتاج قدرة مستمرة كي يعوّض الفقد الحراري، والمتحكم P لا يعطي قدرة إلا إذا وُجد خطأ؛ لذا يبقى خطأ ثابت (Offset). جرّب رفع Kp: يقل الخطأ لكنه لا يختفي.",
  },
  {
    id: "pi-fix",
    title: "٢. إضافة I ← اختفاء الخطأ",
    plant: "heater",
    gains: { kp: 4, ki: 0.4, kd: 0 },
    antiWindup: true, derivOnMeasurement: true, dFilter: 0, disturbance: false, noise: false,
    lesson:
      "الحد التكاملي يجمع الخطأ عبر الزمن فيستمر في رفع القدرة حتى يصل الخطأ إلى صفر. لاحظ في مخطط المكوّنات كيف يتلاشى حد P ويتولى حد I حمل القدرة كاملة في النهاية. ارفع Ki كثيرًا وراقب ظهور التجاوز والتذبذب.",
  },
  {
    id: "p-oscillate",
    title: "٣. Kp كبير ← تذبذب",
    plant: "motor",
    gains: { kp: 0.5, ki: 0, kd: 0 },
    antiWindup: true, derivOnMeasurement: true, dFilter: 0, disturbance: false, noise: false,
    lesson:
      "مع محرك له قصور ذاتي، يؤدي Kp الكبير إلى اندفاع الذراع وتجاوز الهدف ثم الرجوع والتذبذب حوله. الذراع يصل سريعًا لكنه لا يهدأ.",
  },
  {
    id: "pd-damp",
    title: "٤. إضافة D ← إخماد التذبذب",
    plant: "motor",
    gains: { kp: 0.5, ki: 0, kd: 0.04 },
    antiWindup: true, derivOnMeasurement: true, dFilter: 0, disturbance: false, noise: false,
    lesson:
      "الحد التفاضلي ينظر إلى سرعة تغيّر الخطأ فيعمل كمكبح: كلما اقترب الذراع من الهدف بسرعة، قلّل الدفع مسبقًا. النتيجة وصول سريع بتجاوز قليل. جرّب زيادة Kd أكثر لترى استجابة بطيئة \"مُفرطة الإخماد\".",
  },
  {
    id: "cruise-hill",
    title: "٥. PI ضد اضطراب خارجي",
    plant: "cruise",
    gains: { kp: 3, ki: 0.4, kd: 0 },
    antiWindup: true, derivOnMeasurement: true, dFilter: 0, disturbance: true, noise: false,
    lesson:
      "عند الثانية 36 تبدأ السيارة بصعود مرتفع. تنخفض السرعة قليلًا ثم يزيد الحد التكاملي الوقود تدريجيًا حتى تعود السرعة للهدف تمامًا. اجعل Ki = 0 وأعد التشغيل: ستبقى السيارة أبطأ طوال الصعود.",
  },
  {
    id: "windup",
    title: "٦. الإشباع التكاملي (Windup)",
    plant: "heater",
    gains: { kp: 4, ki: 1.2, kd: 0 },
    antiWindup: false, derivOnMeasurement: true, dFilter: 0, disturbance: false, noise: false,
    setpoint: 140,
    lesson:
      "السخّان لا يتجاوز 100% قدرة، لكن التكامل يواصل التراكم أثناء الإشباع. عند الوصول للهدف يكون التكامل قد \"انتفخ\" فيحدث تجاوز كبير وبطء في التعافي. فعّل خيار \"منع الإشباع التكاملي\" وقارن.",
  },
  {
    id: "d-noise",
    title: "٧. المشتقة تُضخّم الضوضاء",
    plant: "motor",
    gains: { kp: 0.5, ki: 0.3, kd: 0.06 },
    antiWindup: true, derivOnMeasurement: true, dFilter: 0, disturbance: false, noise: true,
    lesson:
      "ضوضاء الحساس صغيرة، لكن مشتقتها كبيرة جدًا لأنها تتغير بسرعة. لاحظ أن إشارة التحكم تقفز بعنف بين الحدّين. ارفع \"ترشيح المشتقة\" إلى نحو 0.02 ث لتهدئتها.",
  },
  {
    id: "d-kick",
    title: "٨. ركلة المشتقة (Derivative Kick)",
    plant: "cruise",
    gains: { kp: 3, ki: 0.4, kd: 4 },
    antiWindup: true, derivOnMeasurement: false, dFilter: 0, disturbance: false, noise: false,
    lesson:
      "عند تغيير الهدف فجأة يقفز الخطأ لحظيًا، فتصبح مشتقته هائلة وتظهر نبضة حادة في إشارة التحكم. فعّل خيار \"المشتقة على القياس\": القياس لا يقفز فجأة فتختفي الركلة دون أن يتغير سلوك الاستجابة.",
  },
];

/* ---------------------------------------------------------------
   التحديات: مواصفات أداء يجب أن يحققها المتعلم بضبط المعاملات
   --------------------------------------------------------------- */

export interface ChallengeRule {
  metric: keyof Metrics;
  label: string;
  max: number;
  unit: string;
}

export const CHALLENGES: Record<PlantId, ChallengeRule[]> = {
  heater: [
    { metric: "overshoot", label: "التجاوز", max: 2, unit: "%" },
    { metric: "settlingTime", label: "زمن الاستقرار", max: 10, unit: "ث" },
    { metric: "steadyStateError", label: "الخطأ الثابت", max: 0.5, unit: "%" },
  ],
  motor: [
    { metric: "overshoot", label: "التجاوز", max: 5, unit: "%" },
    { metric: "settlingTime", label: "زمن الاستقرار", max: 0.7, unit: "ث" },
    { metric: "steadyStateError", label: "الخطأ الثابت", max: 1, unit: "%" },
  ],
  cruise: [
    { metric: "overshoot", label: "التجاوز", max: 2, unit: "%" },
    { metric: "steadyStateError", label: "الخطأ الثابت", max: 1, unit: "%" },
    { metric: "disturbanceDip", label: "هبوط السرعة عند المرتفع", max: 2.5, unit: "كم/س" },
  ],
};
