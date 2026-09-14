import Link from "next/link";
import { BarList } from "@/components/charts/BarList";
import { ChartCard } from "@/components/charts/ChartCard";
import { HeroFigure, MetricTile } from "@/components/charts/MetricTile";
import { ShareBar } from "@/components/charts/ShareBar";
import { TREND_COLORS, TrendChart } from "@/components/charts/TrendChart";
import { days, duration, pct } from "@/components/charts/format";
import { SERIES_1, STATUS_COLORS } from "@/components/charts/tokens";
import { PeriodFilter } from "@/app/admin/dashboard/PeriodFilter";
import { getDashboardData, isPeriod, type PeriodKey } from "@/lib/analytics";
import { ESCALATION_DAYS, STATUS_LABELS, TYPE_LABELS } from "@/lib/constants";
import { shortId } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "لوحة المعلومات | مسؤول النظام" };

/**
 * لوحة معلومات مسؤول النظام — قراءة تحليلية فقط لبيانات الطلبات.
 * لا تعدّل أي حالة ولا تضيف أي إجراء؛ الإجراءات تبقى في صفحة الطلبات.
 */
export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: rawPeriod } = await searchParams;
  const period: PeriodKey = isPeriod(rawPeriod) ? rawPeriod : "90";
  const data = await getDashboardData(period);

  const statusSlices = data.byStatus.map((slice) => ({
    label: STATUS_LABELS[slice.status],
    value: slice.count,
    color: STATUS_COLORS[slice.status],
  }));

  const totalForShare = data.byStatus.reduce((sum, slice) => sum + slice.count, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">لوحة المعلومات</h1>
          <p className="mt-1 text-sm text-slate-600">
            قراءة تحليلية لبيانات الطلبات · الفترة المعروضة: {data.periodLabel}
          </p>
        </div>
        {/* صف فلترة واحد أعلى كل ما يخضع له */}
        <PeriodFilter current={period} />
      </div>

      {/* ــــ الرقم الذي تتصدّر به اللوحة + أهم المؤشرات ــــ */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <HeroFigure
          label="طلبات مفتوحة تحتاج متابعة"
          value={data.totals.open}
          hint={`${data.totals.pending} قيد المراجعة · ${data.totals.inProgress} لدى رؤساء الأقسام · ${data.totals.escalated} مُصعّدة`}
        />
        <div className="grid grid-cols-2 gap-4 lg:col-span-3 lg:grid-cols-4">
          <MetricTile label="إجمالي الطلبات" value={data.totals.all} hint={data.periodLabel} />
          <MetricTile
            label="معدل الإنجاز"
            value={pct(data.rates.completion)}
            hint="من الطلبات المُوافق عليها"
            tone={(data.rates.completion ?? 0) >= 50 ? "good" : "neutral"}
          />
          <MetricTile
            label="معدل التصعيد"
            value={pct(data.rates.escalation)}
            hint={`تجاوز ${ESCALATION_DAYS} أيام بلا رد`}
            tone={(data.rates.escalation ?? 0) >= 25 ? "attention" : "neutral"}
          />
          <MetricTile label="معدل الرفض" value={pct(data.rates.rejection)} hint="من الطلبات المبتوتة" />
          <MetricTile
            label="متوسط زمن الإغلاق"
            value={days(data.durations.avgResolutionDays)}
            hint="من التقديم حتى الإنهاء"
          />
          <MetricTile
            label="متوسط زمن مراجعة الأدمن"
            value={duration(data.durations.avgReviewHours)}
            hint="من التقديم حتى الموافقة"
          />
          <MetricTile
            label="متوسط أول رد من رئيس القسم"
            value={duration(data.durations.avgFirstReplyHours)}
            hint="من التحويل حتى أول رسالة"
          />
          <MetricTile
            label="متوسط الرسائل لكل محادثة"
            value={data.avgMessagesPerConversation?.toFixed(1) ?? "—"}
            hint={`${data.messagesTotal} رسالة إجمالًا`}
          />
        </div>
      </section>

      {/* ــــ تنبيه عملي: طلبات على وشك التصعيد التلقائي ــــ */}
      {data.atRisk.length > 0 ? (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-5">
          <h2 className="flex items-center gap-2 text-base font-bold text-amber-900">
            <span aria-hidden>⚠</span>
            {data.atRisk.length} طلب على وشك التصعيد التلقائي
          </h2>
          <p className="mt-1 text-sm text-amber-800">
            لم يردّ رئيس القسم عليها منذ قرابة {ESCALATION_DAYS} أيام. (لقطة لحظية — لا تتأثر
            بفلتر الفترة.)
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {data.atRisk.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-4 py-2.5 text-sm"
              >
                <span className="font-semibold text-slate-800">
                  {row.traineeName}
                  <span className="mr-2 font-normal text-slate-500">
                    {row.traineeNumber} · {row.specialty} · {row.headName ?? "—"}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-bold text-amber-800 [font-variant-numeric:tabular-nums]">
                    {row.daysLeft <= 0
                      ? "تجاوز المهلة"
                      : `يتبقّى ${(row.daysLeft * 24).toFixed(0)} ساعة`}
                  </span>
                  <Link
                    href={`/admin/requests/${row.id}`}
                    className="font-semibold text-sky-600 hover:underline"
                  >
                    عرض
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ــــ الاتجاه الزمني ــــ */}
      <ChartCard
        title="حركة الطلبات أسبوعيًا"
        subtitle="الطلبات الواردة مقابل المنجزة خلال آخر 12 أسبوعًا — مقياس واحد لكلتا السلسلتين"
        tableHead={["الأسبوع", "وارد", "منجَز"]}
        tableRows={data.trend.map((point) => [point.label, point.submitted, point.completed])}
      >
        <TrendChart
          labels={data.trend.map((point) => point.label)}
          series={[
            { label: "وارد", color: TREND_COLORS.submitted, values: data.trend.map((p) => p.submitted) },
            { label: "منجَز", color: TREND_COLORS.completed, values: data.trend.map((p) => p.completed) },
          ]}
        />
      </ChartCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ــــ توزيع الحالات (نسبة إلى الكل) ــــ */}
        <ChartCard
          title="توزيع الطلبات على الحالات"
          subtitle="ترتيب سير العمل: مراجعة ← رفض ← معالجة ← تصعيد ← إنجاز"
          tableHead={["الحالة", "العدد", "النسبة"]}
          tableRows={data.byStatus.map((slice) => [
            STATUS_LABELS[slice.status],
            slice.count,
            totalForShare > 0 ? `${((slice.count / totalForShare) * 100).toFixed(1)}%` : "—",
          ])}
        >
          <ShareBar slices={statusSlices} />
        </ChartCard>

        {/* ــــ حسب النوع (مقارنة مقدار) ــــ */}
        <ChartCard
          title="الطلبات حسب النوع"
          subtitle="مقارنة أعداد الطلبات والشكاوى والاستفسارات"
          tableHead={["النوع", "العدد"]}
          tableRows={data.byType.map((slice) => [TYPE_LABELS[slice.type], slice.count])}
        >
          <BarList
            rows={data.byType.map((slice) => ({
              label: TYPE_LABELS[slice.type],
              value: slice.count,
            }))}
          />
        </ChartCard>
      </div>

      {/* ــــ حسب التخصص ــــ */}
      <ChartCard
        title="الطلبات حسب التخصص"
        subtitle="إجمالي الطلبات لكل تخصص — العدد بين قوسين هو المفتوح منها حاليًا"
        tableHead={["التخصص", "رئيس القسم", "الإجمالي", "مفتوحة", "مُصعّدة", "منتهية"]}
        tableRows={data.bySpecialty.map((row) => [
          row.name,
          row.headName ?? "غير مرتبط",
          row.total,
          row.open,
          row.escalated,
          row.completed,
        ])}
      >
        <BarList
          color={SERIES_1}
          rows={data.bySpecialty.map((row) => ({
            label: row.name,
            value: row.total,
            hint: row.open > 0 ? `(${row.open} مفتوحة)` : undefined,
          }))}
        />
      </ChartCard>

      {/* ــــ أداء رؤساء الأقسام: عدة أرقام لكل صف ⇐ الشكل الصحيح جدول ــــ */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-slate-800">أداء رؤساء الأقسام</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            عدة مؤشرات لكل رئيس قسم — الجدول أوضح من المخطط هنا
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-right text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-600">
              <tr>
                <th className="px-4 py-3">رئيس القسم</th>
                <th className="px-4 py-3">التخصصات</th>
                <th className="px-4 py-3">محوّلة إليه</th>
                <th className="px-4 py-3">قيد المعالجة</th>
                <th className="px-4 py-3">مُصعّدة</th>
                <th className="px-4 py-3">منتهية</th>
                <th className="px-4 py-3">متوسط أول رد</th>
                <th className="px-4 py-3">معدل التصعيد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 [font-variant-numeric:tabular-nums]">
              {data.byHead.map((row) => (
                <tr key={row.name} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.name}</td>
                  <td className="px-4 py-3 text-slate-600">{row.specialties}</td>
                  <td className="px-4 py-3 text-slate-700">{row.assigned}</td>
                  <td className="px-4 py-3 text-slate-700">{row.inProgress}</td>
                  <td className="px-4 py-3 text-slate-700">{row.escalated}</td>
                  <td className="px-4 py-3 text-slate-700">{row.completed}</td>
                  <td className="px-4 py-3 text-slate-700">{duration(row.avgFirstReplyHours)}</td>
                  <td className="px-4 py-3 text-slate-700">{pct(row.escalationRate)}</td>
                </tr>
              ))}
              {data.byHead.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    لا يوجد رؤساء أقسام مسجّلون بعد
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* ــــ أقدم الطلبات المفتوحة ــــ */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-slate-800">أقدم الطلبات المفتوحة</h2>
          <p className="mt-0.5 text-sm text-slate-500">لقطة لحظية — لا تتأثر بفلتر الفترة</p>
        </header>
        {data.oldestOpen.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            لا توجد طلبات مفتوحة حاليًا.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {data.oldestOpen.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <span className="text-sm">
                  <span className="font-semibold text-slate-800">{row.traineeName}</span>
                  <span className="mr-2 text-slate-500">
                    {row.traineeNumber} · {row.specialty} · #{shortId(row.id)}
                  </span>
                </span>
                <span className="flex items-center gap-3 text-sm">
                  <span className="font-bold text-slate-700 [font-variant-numeric:tabular-nums]">
                    مفتوح منذ {row.daysWaiting.toFixed(0)} يومًا
                  </span>
                  <Link
                    href={`/admin/requests/${row.id}`}
                    className="font-semibold text-sky-600 hover:underline"
                  >
                    عرض
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
