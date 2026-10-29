import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { CodeLab } from "./CodeLab";
import { DroneDemo } from "./DroneDemo";
import { Quiz } from "./Quiz";
import { Simulator } from "./Simulator";

export const metadata: Metadata = {
  title: "المتحكم PID — شرح تفاعلي",
  description: "صفحة تعليمية تفاعلية تشرح المتحكم التناسبي التكاملي التفاضلي PID مع محاكيات وأمثلة تُجرَّب مباشرة في المتصفح",
};

const TOC = [
  { id: "intro", label: "ما هو PID؟" },
  { id: "equation", label: "المعادلة" },
  { id: "lab", label: "المختبر التفاعلي" },
  { id: "drone", label: "تجربة حيّة" },
  { id: "code", label: "اكتب متحكمك" },
  { id: "tuning", label: "دليل الضبط" },
  { id: "implementation", label: "التطبيق العملي" },
  { id: "quiz", label: "اختبر نفسك" },
];

function Section({
  id,
  num,
  title,
  lead,
  children,
}: {
  id: string;
  num: number;
  title: string;
  lead?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 pt-14">
      <div className="mb-5">
        <span className="text-sm font-bold text-sky-600">القسم {num}</span>
        <h2 className="mt-1 text-2xl font-extrabold text-slate-900">{title}</h2>
        {lead && <p className="mt-2 max-w-3xl text-base leading-8 text-slate-600">{lead}</p>}
      </div>
      {children}
    </section>
  );
}

/** مخطط الحلقة المغلقة: الهدف ← المقارن ← المتحكم ← النظام ← الحساس ← عودة للمقارن */
function LoopDiagram() {
  const box = "fill-white stroke-slate-400";
  return (
    <div dir="ltr">
      <svg viewBox="0 0 720 200" className="w-full" role="img" aria-label="مخطط الحلقة المغلقة للتحكم">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#475569" />
          </marker>
        </defs>
        <g stroke="#475569" strokeWidth="2" fill="none" markerEnd="url(#arrow)">
          <path d="M20,70 H112" />
          <path d="M152,70 H232" />
          <path d="M372,70 H442" />
          <path d="M582,70 H700" />
          <path d="M640,70 V160 H442" />
          <path d="M302,160 H132 V92" />
        </g>
        <circle cx="132" cy="70" r="20" className={box} strokeWidth="2" />
        <text x="132" y="76" textAnchor="middle" fontSize="20" fill="#0f172a">Σ</text>
        <text x="108" y="58" fontSize="13" fill="#0f172a">+</text>
        <text x="138" y="102" fontSize="15" fill="#0f172a">−</text>
  
        <rect x="232" y="40" width="140" height="60" rx="10" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
        <text x="302" y="66" textAnchor="middle" fontSize="16" fontWeight="700" fill="#075985">PID</text>
        <text x="302" y="87" textAnchor="middle" fontSize="12" fill="#075985">المتحكم</text>
  
        <rect x="442" y="40" width="140" height="60" rx="10" className={box} strokeWidth="2" />
        <text x="512" y="66" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0f172a">النظام</text>
        <text x="512" y="87" textAnchor="middle" fontSize="11" fill="#475569">محرك، سخّان، سيارة…</text>
  
        <rect x="302" y="140" width="140" height="40" rx="10" className={box} strokeWidth="2" />
        <text x="372" y="165" textAnchor="middle" fontSize="13" fill="#0f172a">الحساس</text>
  
        <text x="22" y="58" fontSize="12" fill="#475569">الهدف r(t)</text>
        <text x="160" y="58" fontSize="12" fill="#b91c1c">الخطأ e(t)</text>
        <text x="378" y="58" fontSize="12" fill="#475569">التحكم u(t)</text>
        <text x="600" y="58" fontSize="12" fill="#475569">المخرج y(t)</text>
      </svg>
    </div>
  );
}

const TERMS = [
  {
    key: "P",
    name: "التناسبي (Proportional)",
    color: "border-amber-400 bg-amber-50",
    badge: "bg-amber-500",
    formula: "Kp · e(t)",
    time: "الحاضر",
    body: "يستجيب لحجم الخطأ الآن: كلما ابتعدت عن الهدف دفعت بقوة أكبر. هو المحرك الأساسي للاستجابة.",
    plus: "بسيط وسريع",
    minus: "يترك غالبًا خطأً ثابتًا، والقيمة الكبيرة تسبب تذبذبًا",
  },
  {
    key: "I",
    name: "التكاملي (Integral)",
    color: "border-sky-400 bg-sky-50",
    badge: "bg-sky-600",
    formula: "Ki · ∫ e(τ) dτ",
    time: "الماضي",
    body: "يجمع الخطأ عبر الزمن. أي خطأ صغير مستمر يتراكم حتى يصبح كافيًا لتصحيحه، فيُلغي الخطأ الثابت تمامًا.",
    plus: "يوصل النظام للهدف بدقة",
    minus: "يُبطئ ويزيد التجاوز، ويعاني من الإشباع التكاملي",
  },
  {
    key: "D",
    name: "التفاضلي (Derivative)",
    color: "border-violet-400 bg-violet-50",
    badge: "bg-violet-700",
    formula: "Kd · de(t)/dt",
    time: "المستقبل",
    body: "ينظر إلى سرعة تغيّر الخطأ فيتنبأ بما سيحدث: إن كنت تقترب من الهدف بسرعة، يضغط على \"المكابح\" مبكرًا.",
    plus: "يُخمد التذبذب ويقلل التجاوز",
    minus: "حساس جدًا للضوضاء، ويحتاج ترشيحًا",
  },
];

const ARDUINO = `// متحكم PID رقمي — يعمل على Arduino أو أي متحكم دقيق
float Kp = 2.0, Ki = 0.5, Kd = 0.1;
float setpoint = 80.0;           // القيمة المطلوبة
float integral = 0, prevInput = 0;
const float OUT_MIN = 0, OUT_MAX = 255;
const unsigned long DT_MS = 20;  // زمن العيّنة: 50 مرة في الثانية
unsigned long lastTime = 0;

void loop() {
  unsigned long now = millis();
  if (now - lastTime < DT_MS) return;     // زمن عيّنة ثابت مهم جدًا
  float dt = (now - lastTime) / 1000.0;
  lastTime = now;

  float input = readSensor();             // قراءة الحساس
  float error = setpoint - input;

  // P
  float P = Kp * error;

  // I مع منع الإشباع التكاملي (تقييد التكامل)
  integral += Ki * error * dt;
  integral = constrain(integral, OUT_MIN, OUT_MAX);

  // D على القياس لتجنّب ركلة المشتقة عند تغيير الهدف
  float D = -Kd * (input - prevInput) / dt;
  prevInput = input;

  float output = constrain(P + integral + D, OUT_MIN, OUT_MAX);
  analogWrite(HEATER_PIN, (int)output);   // إرسال الأمر للمشغّل
}`;

const PYTHON = `class PID:
    def __init__(self, kp, ki, kd, out_min, out_max):
        self.kp, self.ki, self.kd = kp, ki, kd
        self.out_min, self.out_max = out_min, out_max
        self.integral = 0.0
        self.prev = None

    def update(self, setpoint, measured, dt):
        error = setpoint - measured
        self.integral += error * dt
        derivative = 0.0 if self.prev is None else (error - self.prev) / dt
        self.prev = error
        u = self.kp * error + self.ki * self.integral + self.kd * derivative
        return max(self.out_min, min(self.out_max, u))

# مثال الاستخدام داخل حلقة التحكم
pid = PID(kp=2.0, ki=0.5, kd=0.1, out_min=0, out_max=100)
power = pid.update(setpoint=80, measured=read_temperature(), dt=0.02)`;

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-700 px-4 py-2 text-xs font-bold text-slate-300">{title}</div>
      <pre dir="ltr" className="overflow-x-auto p-4 text-[13px] leading-6 text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function PidPage() {
  return (
    <>
      <SiteHeader />

      <div className="border-b border-slate-200 bg-gradient-to-b from-sky-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-12 text-center">
          <span className="inline-block rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
            درس تفاعلي في أنظمة التحكم
          </span>
          <h1 className="mt-4 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            المتحكم PID: من الفكرة إلى التطبيق
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-600">
            تعلّم كيف يحافظ المتحكم التناسبي التكاملي التفاضلي على درجة حرارة الفرن، وزاوية ذراع الروبوت، وسرعة
            السيارة. حرّك المنزلقات، شغّل الأمثلة، واكتب متحكمك الخاص — كل شيء يعمل مباشرة داخل هذه الصفحة.
          </p>
        </div>
      </div>

      <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 text-sm font-semibold">
          {TOC.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="shrink-0 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 pb-20">
        <Section
          id="intro"
          num={1}
          title="ما هو المتحكم PID؟"
          lead={
            <>
              تخيّل أنك تضبط حرارة ماء الدش: تقيس الحرارة بيدك، تقارنها بما تريد، ثم تدير الصنبور. إن كان الماء باردًا
              جدًا تديره كثيرًا، وإن كنت قريبًا تديره قليلًا. هذا بالضبط ما يفعله المتحكم PID — لكن آلاف المرات في
              الثانية وبدقة رياضية.
            </>
          }
        >
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <LoopDiagram />
            <ol className="mt-4 grid grid-cols-1 gap-3 text-sm leading-7 text-slate-600 md:grid-cols-4">
              <li className="rounded-lg bg-slate-50 p-3">
                <b className="block text-slate-800">١. القياس</b>
                الحساس يقيس المخرج الحالي y (مثل الحرارة).
              </li>
              <li className="rounded-lg bg-slate-50 p-3">
                <b className="block text-slate-800">٢. حساب الخطأ</b>
                e = r − y: الفرق بين ما نريده وما لدينا.
              </li>
              <li className="rounded-lg bg-slate-50 p-3">
                <b className="block text-slate-800">٣. القرار</b>
                المتحكم يحسب إشارة التحكم u من الخطأ.
              </li>
              <li className="rounded-lg bg-slate-50 p-3">
                <b className="block text-slate-800">٤. التنفيذ والتكرار</b>
                المشغّل ينفذ الأمر، فيتغير المخرج، وتبدأ الدورة من جديد.
              </li>
            </ol>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              تُسمى هذه البنية <b>حلقة تحكم مغلقة</b> (Closed Loop) لأن المخرج يعود ليؤثر في القرار. يُستخدم PID في
              أكثر من 90% من حلقات التحكم الصناعية: المكيفات، الطابعات ثلاثية الأبعاد، الطائرات المسيّرة، مثبّت
              السرعة، خطوط الإنتاج، وغيرها.
            </p>
          </div>
        </Section>

        <Section
          id="equation"
          num={2}
          title="المعادلة: ثلاثة حدود، ثلاث نظرات للزمن"
          lead="إشارة التحكم هي مجموع ثلاثة حدود، كل حد يعالج الخطأ من زاوية مختلفة: الحاضر والماضي والمستقبل."
        >
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div dir="ltr" className="font-mono text-lg leading-loose text-slate-900 sm:text-2xl">
              u(t) = <span className="rounded bg-amber-100 px-1.5 text-amber-800">K<sub>p</sub>·e(t)</span> +{" "}
              <span className="rounded bg-sky-100 px-1.5 text-sky-800">
                K<sub>i</sub>·∫<sub>0</sub><sup>t</sup> e(τ)dτ
              </span>{" "}
              + <span className="rounded bg-violet-100 px-1.5 text-violet-800">K<sub>d</sub>·de(t)/dt</span>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              حيث e(t) = r(t) − y(t) هو الخطأ، وKp وKi وKd معاملات نختارها نحن (عملية &quot;الضبط&quot; أو Tuning).
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {TERMS.map((term) => (
              <div key={term.key} className={`rounded-xl border-s-4 p-5 ${term.color}`}>
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg font-extrabold text-white ${term.badge}`}>
                    {term.key}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900">{term.name}</h3>
                    <span className="text-xs text-slate-500">ينظر إلى: {term.time}</span>
                  </div>
                </div>
                <div dir="ltr" className="mt-3 font-mono text-sm text-slate-700">
                  {term.formula}
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-700">{term.body}</p>
                <p className="mt-2 text-sm text-emerald-800">✔ {term.plus}</p>
                <p className="text-sm text-rose-800">✘ {term.minus}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="lab"
          num={3}
          title="المختبر التفاعلي"
          lead="اختر نظامًا، ثم حرّك المنزلقات وشاهد النتيجة فورًا. ابدأ بالأمثلة الجاهزة بالترتيب: كل مثال يكشف فكرة أساسية. مرّر المؤشر فوق المخطط لقراءة القيم."
        >
          <Simulator />
        </Section>

        <Section
          id="drone"
          num={4}
          title="تجربة حيّة: طائرة مسيّرة تحافظ على ارتفاعها"
          lead="هنا يعمل المتحكم في الزمن الحقيقي. غيّر المعاملات أثناء الطيران، وأضف هبّات ريح وحمولة، وراقب كيف يتعامل المتحكم معها."
        >
          <DroneDemo />
        </Section>

        <Section
          id="code"
          num={5}
          title="اكتب متحكمك بنفسك"
          lead="المتحكم PID في النهاية بضعة أسطر من الكود. عدّل الدالة أدناه بلغة JavaScript ثم شغّلها على أي نظام. جرّب القوالب الجاهزة وقارن بين المتحكم البسيط والاحترافي."
        >
          <CodeLab />
        </Section>

        <Section id="tuning" num={6} title="دليل الضبط (Tuning)" lead="كيف تختار Kp وKi وKd لنظام حقيقي؟ إليك أثر كل معامل وطريقتين عمليتين للضبط.">
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[560px] text-center text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-3 text-start">عند زيادة…</th>
                  <th className="px-3 py-3">زمن الصعود</th>
                  <th className="px-3 py-3">التجاوز</th>
                  <th className="px-3 py-3">زمن الاستقرار</th>
                  <th className="px-3 py-3">الخطأ الثابت</th>
                  <th className="px-3 py-3">الاستقرار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="px-3 py-3 text-start font-bold text-amber-700">Kp</td>
                  <td>⬇ يقل</td>
                  <td>⬆ يزيد</td>
                  <td>تغيّر بسيط</td>
                  <td>⬇ يقل</td>
                  <td>⬇ يسوء</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 text-start font-bold text-sky-700">Ki</td>
                  <td>⬇ يقل</td>
                  <td>⬆ يزيد</td>
                  <td>⬆ يزيد</td>
                  <td>✔ يُلغى</td>
                  <td>⬇ يسوء</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 text-start font-bold text-violet-700">Kd</td>
                  <td>تغيّر بسيط</td>
                  <td>⬇ يقل</td>
                  <td>⬇ يقل</td>
                  <td>لا أثر نظريًا</td>
                  <td>⬆ يتحسن (إن كان صغيرًا)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-slate-900">الطريقة اليدوية (الأكثر استخدامًا)</h3>
              <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm leading-7 text-slate-700">
                <li>اجعل Ki = 0 وKd = 0.</li>
                <li>ارفع Kp تدريجيًا حتى يستجيب النظام بسرعة مع تذبذب بسيط.</li>
                <li>أضف Kd شيئًا فشيئًا حتى يختفي التذبذب ويقل التجاوز.</li>
                <li>أضف Ki ببطء حتى يختفي الخطأ الثابت في وقت مقبول.</li>
                <li>كرّر الضبط الدقيق، وتأكد من السلوك مع الاضطرابات والضوضاء.</li>
              </ol>
              <p className="mt-3 text-xs text-slate-500">جرّب هذه الخطوات على تحدّي المحرك في المختبر أعلاه.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-slate-900">طريقة زيغلر–نيكولز (Ziegler–Nichols)</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                اجعل Ki وKd صفرًا، وارفع Kp حتى يتذبذب النظام تذبذبًا مستمرًا منتظمًا. سجّل هذه القيمة{" "}
                <b dir="ltr">Ku</b> وزمن الذبذبة الواحدة <b dir="ltr">Tu</b>، ثم احسب:
              </p>
              <table className="mt-3 w-full text-center text-sm" dir="ltr">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="py-2">Type</th>
                    <th>Kp</th>
                    <th>Ki</th>
                    <th>Kd</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                  <tr>
                    <td className="py-2 font-sans font-bold">P</td>
                    <td>0.5·Ku</td>
                    <td>—</td>
                    <td>—</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-sans font-bold">PI</td>
                    <td>0.45·Ku</td>
                    <td>0.54·Ku/Tu</td>
                    <td>—</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-sans font-bold">PID</td>
                    <td>0.6·Ku</td>
                    <td>1.2·Ku/Tu</td>
                    <td>0.075·Ku·Tu</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-3 text-xs leading-6 text-slate-500">
                تعطي هذه الطريقة نقطة بداية جيدة لكنها &quot;عدوانية&quot; (تجاوز يقارب 25%)، لذا تُتبع عادة بضبط يدوي.
              </p>
            </div>
          </div>
        </Section>

        <Section
          id="implementation"
          num={7}
          title="التطبيق العملي في الأنظمة الحقيقية"
          lead="عند نقل المتحكم إلى متحكم دقيق مثل Arduino أو إلى برنامج Python، هذه أهم النقاط العملية:"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["⏱ زمن عيّنة ثابت", "نفّذ الحلقة على فترات منتظمة؛ تغيّر dt يفسد التكامل والمشتقة."],
              ["🧱 حدود المشغّل", "قيّد الإخراج بحدود المشغّل الحقيقية وامنع الإشباع التكاملي."],
              ["📉 ترشيح المشتقة", "الحساسات الحقيقية مليئة بالضوضاء؛ رشّح حد D أو احسبه على القياس."],
              ["🔁 الانتقال السلس", "عند تشغيل المتحكم أو تغيير المعاملات، ابدأ التكامل بقيمة تمنع القفزات."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
                <b className="block text-slate-900">{title}</b>
                <span className="mt-1 block leading-7 text-slate-600">{body}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <CodeBlock title="Arduino (C++)" code={ARDUINO} />
            <CodeBlock title="Python" code={PYTHON} />
          </div>
        </Section>

        <Section id="quiz" num={8} title="اختبر فهمك" lead="خمسة أسئلة سريعة للتأكد من استيعاب الأفكار الأساسية.">
          <Quiz />
        </Section>
      </main>
    </>
  );
}
