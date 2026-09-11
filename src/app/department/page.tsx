import { RequestsTable } from "@/components/RequestsTable";
import { StatCard } from "@/components/StatCard";
import { CountBadge } from "@/components/StatusBadge";
import { Card, CardHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { findAwaitingReplyIds } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "لوحة رئيس القسم" };

/** لوحة رئيس القسم — يرى فقط الطلبات المحوّلة إليه */
export default async function DepartmentDashboardPage() {
  const user = await requireRole("DEPT_HEAD");

  const requests = await prisma.request.findMany({
    where: { assignedHeadId: user.id },
    orderBy: { createdAt: "desc" },
    include: { specialty: true, assignedHead: true },
  });

  const inProgress = requests.filter((request) => request.status === "IN_PROGRESS");
  const escalated = requests.filter((request) => request.status === "ESCALATED");
  const completed = requests.filter((request) => request.status === "COMPLETED");

  // الطلبات التي تنتظر ردّه: جديدة أو ردّ عليها المتدرب برسالة جديدة
  const awaiting = await findAwaitingReplyIds(
    inProgress.map((request) => request.id),
    "DEPT_HEAD"
  );

  const rows = requests.map((request) => ({
    ...request,
    awaitingReply: awaiting.has(request.id),
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="flex items-center gap-2 text-xl font-extrabold text-slate-900">
        الطلبات المحوّلة إليّ
        <CountBadge count={awaiting.size} />
      </h1>

      {awaiting.size > 0 ? (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 ring-1 ring-rose-200">
          لديك {awaiting.size} طلب بانتظار ردّك. تذكّر: الطلب الذي يمر عليه 3 أيام دون ردّ منك يُصعَّد
          تلقائيًا إلى وكيل التدريب.
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="بانتظار ردّك" value={awaiting.size} tone="alert" />
        <StatCard label="قيد المعالجة" value={inProgress.length} tone="info" />
        <StatCard label="مُصعّدة لوكيل التدريب" value={escalated.length} tone="purple" />
        <StatCard label="منتهية" value={completed.length} tone="success" />
      </section>

      <Card>
        <CardHeader
          title={`كل طلباتي (${requests.length})`}
          subtitle="النقطة الحمراء بجانب اسم المتدرب تعني أن الطلب ينتظر ردّك"
        />
        <RequestsTable
          requests={rows}
          basePath="/department/requests"
          showAssignedHead={false}
          emptyTitle="لا توجد طلبات محوّلة إليك بعد"
          emptyDescription="ستظهر هنا الطلبات فور موافقة مسؤول النظام عليها وتحويلها لتخصصك."
        />
      </Card>
    </div>
  );
}
