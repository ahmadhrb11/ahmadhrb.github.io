import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

const CARDS = [
  {
    href: "/submit",
    title: "تقديم طلب جديد",
    description: "قدّم طلبًا أو شكوى أو استفسارًا. لا يتطلب تسجيل دخول.",
    cta: "ابدأ التقديم",
  },
  {
    href: "/track",
    title: "تتبّع طلباتي",
    description: "أدخل رقمك التدريبي لعرض جميع طلباتك وحالاتها ومتابعة المحادثة.",
    cta: "تتبّع الآن",
  },
  {
    href: "/login",
    title: "دخول الموظفين",
    description: "مسؤول النظام، رؤساء الأقسام، ووكيل التدريب.",
    cta: "تسجيل الدخول",
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14">
        <section className="text-center">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            نظام متابعة طلبات المتدربين
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-8 text-slate-600">
            قدّم طلبك أو شكواك أو استفسارك، وتابع حالته خطوة بخطوة: من مراجعة مسؤول النظام، إلى
            المحادثة المباشرة مع رئيس القسم، وحتى إغلاق الطلب.
          </p>
        </section>

        <section className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-400 hover:shadow-md"
            >
              <h2 className="text-lg font-bold text-slate-900">{card.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{card.description}</p>
              <span className="mt-4 inline-block text-sm font-bold text-sky-600 group-hover:underline">
                {card.cta} ←
              </span>
            </Link>
          ))}
        </section>

        <section className="mt-14 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">كيف يسير طلبك؟</h2>
          <ol className="mt-4 grid grid-cols-1 gap-4 text-sm leading-7 text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
            <li className="rounded-lg bg-slate-50 p-4">
              <span className="block font-bold text-slate-800">1. قيد المراجعة</span>
              يصل طلبك إلى مسؤول النظام لمراجعته.
            </li>
            <li className="rounded-lg bg-slate-50 p-4">
              <span className="block font-bold text-slate-800">2. قيد المعالجة</span>
              عند الموافقة يُحوّل تلقائيًا إلى رئيس قسم تخصصك، وتبدأ المحادثة.
            </li>
            <li className="rounded-lg bg-slate-50 p-4">
              <span className="block font-bold text-slate-800">3. التصعيد التلقائي</span>
              إن تأخر رئيس القسم عن الرد 3 أيام، يُصعَّد الطلب لوكيل التدريب.
            </li>
            <li className="rounded-lg bg-slate-50 p-4">
              <span className="block font-bold text-slate-800">4. منتهي</span>
              يُغلق الطلب يدويًا من مسؤول النظام بعد اكتمال المعالجة.
            </li>
          </ol>
        </section>

        <p className="mt-10 text-center text-sm text-slate-500">
          مواد تعليمية:{" "}
          <Link href="/pid" className="font-bold text-sky-600 hover:underline">
            درس تفاعلي عن المتحكم PID
          </Link>
        </p>
      </main>
    </>
  );
}
