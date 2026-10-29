"use client";

/** اختبار قصير لقياس الفهم مع تصحيح فوري وشرح لكل إجابة */
import { useState } from "react";
import { Card } from "./controls";

const QUESTIONS: { q: string; options: string[]; answer: number; why: string }[] = [
  {
    q: "سخّان يستقر دائمًا تحت درجة الحرارة المطلوبة بـ 3 درجات. أي حد يجب أن تضيفه أو تزيده؟",
    options: ["Kp فقط", "Ki", "Kd", "لا شيء، هذا طبيعي"],
    answer: 1,
    why: "الخطأ الثابت يُعالج بالحد التكاملي، فهو يتراكم ما دام الخطأ موجودًا حتى يدفعه إلى الصفر.",
  },
  {
    q: "ذراع روبوت يتذبذب كثيرًا حول الهدف قبل أن يستقر. ما الحل الأنسب أولًا؟",
    options: ["زيادة Kd", "زيادة Ki", "زيادة Kp", "إزالة الحساس"],
    answer: 0,
    why: "الحد التفاضلي يعمل كمخمّد يعاكس سرعة الاقتراب من الهدف، فيقلل التجاوز والتذبذب. زيادة Kp أو Ki تزيد التذبذب عادة.",
  },
  {
    q: "لماذا قد يجعل Kd الكبير إشارة التحكم مضطربة جدًا في الأنظمة الحقيقية؟",
    options: [
      "لأنه يُبطئ النظام",
      "لأن المشتقة تُضخّم الضوضاء عالية التردد في الحساس",
      "لأنه يُلغي الحد التكاملي",
      "لأنه يزيد الخطأ الثابت",
    ],
    answer: 1,
    why: "الضوضاء تتغير بسرعة كبيرة فتكون مشتقتها ضخمة؛ لذلك يُستخدم دائمًا مرشح تمرير منخفض مع حد D.",
  },
  {
    q: "ما الذي يسبب ظاهرة الإشباع التكاملي (Integral Windup)؟",
    options: [
      "Kp صغير جدًا",
      "استمرار تراكم التكامل بينما المشغّل وصل لحدّه الأقصى",
      "استخدام المشتقة على القياس",
      "سرعة المعالج العالية",
    ],
    answer: 1,
    why: "حين يُشبع المشغّل (مثل 100% قدرة) لا يفيد التكامل الإضافي، لكنه يتراكم ويسبب تجاوزًا كبيرًا لاحقًا. الحل: إيقاف التراكم أثناء الإشباع.",
  },
  {
    q: "في معادلة PID، ما وحدة Ki إذا كان الخطأ بالدرجات وإشارة التحكم بالفولت؟",
    options: ["V/°", "V/(°·s)", "V·s/°", "بلا وحدة"],
    answer: 1,
    why: "الحد التكاملي هو Ki × ∫e dt، والتكامل وحدته °·s، لذا Ki = V/(°·s) كي يكون الناتج فولت.",
  },
];

export function Quiz() {
  const [picked, setPicked] = useState<(number | null)[]>(() => QUESTIONS.map(() => null));
  const score = picked.filter((p, i) => p === QUESTIONS[i].answer).length;
  const done = picked.every((p) => p !== null);

  return (
    <div className="space-y-4">
      {QUESTIONS.map((item, qi) => {
        const choice = picked[qi];
        return (
          <Card key={qi}>
            <p className="font-bold leading-7 text-slate-900">
              {qi + 1}. {item.q}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {item.options.map((opt, oi) => {
                const isAnswer = oi === item.answer;
                const isPicked = choice === oi;
                const tone =
                  choice === null
                    ? "border-slate-200 hover:border-sky-300 hover:bg-sky-50"
                    : isAnswer
                      ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                      : isPicked
                        ? "border-rose-400 bg-rose-50 text-rose-900"
                        : "border-slate-200 opacity-60";
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={choice !== null}
                    onClick={() => setPicked((p) => p.map((v, i) => (i === qi ? oi : v)))}
                    className={`rounded-lg border px-3 py-2 text-start text-sm transition ${tone}`}
                  >
                    <bdi>{opt}</bdi>
                  </button>
                );
              })}
            </div>
            {choice !== null && (
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {choice === item.answer ? "✅ صحيح. " : "❌ ليست الإجابة الصحيحة. "}
                {item.why}
              </p>
            )}
          </Card>
        );
      })}
      {done && (
        <Card className="text-center">
          <p className="text-lg font-extrabold text-slate-900">
            نتيجتك: {score} من {QUESTIONS.length} {score === QUESTIONS.length ? "🎉" : ""}
          </p>
          <button
            type="button"
            onClick={() => setPicked(QUESTIONS.map(() => null))}
            className="mt-2 text-sm font-bold text-sky-700 hover:underline"
          >
            إعادة الاختبار
          </button>
        </Card>
      )}
    </div>
  );
}
