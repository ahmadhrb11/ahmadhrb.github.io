import { RequestsTable } from "@/components/RequestsTable";
import { StatCard } from "@/components/StatCard";
import { CountBadge } from "@/components/StatusBadge";
import { Card, CardHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { findAwaitingReplyIds } from "@/lib/queries";
import { ESCALATION_DAYS } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "لوحة وكيل التدريب" };

/** لوحة وكيل التدريب — الطلبات المُصعّدة إليه تلقائيًا من أي قسم */
export default async function DeputyDashboardPage() {
  await requireRole("DEPUTY");

  const [escalated, closed] = await Promise.all([
    prisma.request.findMany({
      where: { status: "ESCALATED" },
      orderBy: { escalatedAt: "desc" },
      include: { specialty: true, assignedHead: true },
    }),
    // الطلبات التي كانت مُصعّدة وأُنهيت — للأرشيف والاطلاع
    prisma.request.findMany({
      where: { status: "COMPLETED", escalatedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      include: { specialty: true, assignedHead: true },
    }),
  ]);

  const awaiting = await findAwaitingReplyIds(
    escalated.map((request) => request.id),
    "DEPUTY"
  );

  const rows = escalated.map((request) => ({
    ...request,
    awaitingReply: awaiting.has(request.id),
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="flex items-center gap-2 text-xl font-extrabold text-slate-900">
        الطلبات المُصعّدة إليّ
        <CountBadge count={awaiting.size} />
      </h1>

      <div className="rounded-lg bg-purple-50 px-4 py-3 text-sm text-purple-900 ring-1 ring-purple-200">
        تصل إليك الطلبات تلقائيًا من أي قسم عند مرور {ESCALATION_DAYS} أيام دون رد من رئيس القسم، وتتولّى
        أنت مراسلة المتدرب بدلًا عنه.
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="بانتظار ردّك" value={awaiting.size} tone="alert" />
        <StatCard label="مُصعّدة حاليًا" value={escalated.length} tone="purple" />
        <StatCard label="مُصعّدة سابقًا ومنتهية" value={closed.length} tone="success" />
      </section>

      <Card>
        <CardHeader
          title={`الطلبات المُصعّدة (${escalated.length})`}
          subtitle="النقطة الحمراء بجانب اسم المتدرب تعني أن الطلب ينتظر ردّك"
        />
        <RequestsTable
          requests={rows}
          basePath="/deputy/requests"
          emptyTitle="لا توجد طلبات مُصعّدة حاليًا"
          emptyDescription={`ستظهر هنا الطلبات التي يمر عليها ${ESCALATION_DAYS} أيام دون رد من رئيس القسم.`}
        />
      </Card>

      {closed.length > 0 ? (
        <Card>
          <CardHeader title={`أرشيف الطلبات المُصعّدة المنتهية (${closed.length})`} />
          <RequestsTable requests={closed} basePath="/deputy/requests" />
        </Card>
      ) : null}
    </div>
  );
}
