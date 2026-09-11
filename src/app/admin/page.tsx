import Link from "next/link";
import type { Prisma, RequestStatus, RequestType } from "@prisma/client";
import { RequestFilters } from "@/components/RequestFilters";
import { RequestsTable } from "@/components/RequestsTable";
import { StatCard } from "@/components/StatCard";
import { Card, CardHeader } from "@/components/ui";
import { CountBadge } from "@/components/StatusBadge";
import { prisma } from "@/lib/prisma";
import { STATUS_LABELS, TYPE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "لوحة مسؤول النظام" };

type SearchParams = { status?: string; type?: string; specialtyId?: string; q?: string };

function isStatus(value?: string): value is RequestStatus {
  return !!value && value in STATUS_LABELS;
}
function isType(value?: string): value is RequestType {
  return !!value && value in TYPE_LABELS;
}

/** لوحة مسؤول النظام — يرى جميع الطلبات بلا استثناء */
export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = await searchParams;

  // بناء شرط البحث من الفلاتر
  const where: Prisma.RequestWhereInput = {};
  if (isStatus(filters.status)) where.status = filters.status;
  if (isType(filters.type)) where.type = filters.type;
  if (filters.specialtyId) where.specialtyId = filters.specialtyId;
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [{ traineeName: { contains: q } }, { traineeNumber: { contains: q } }];
  }

  const [requests, specialties, counts] = await Promise.all([
    prisma.request.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { specialty: true, assignedHead: true },
    }),
    prisma.specialty.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.request.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countBy = (status: RequestStatus) =>
    counts.find((entry) => entry.status === status)?._count._all ?? 0;

  const pendingCount = countBy("PENDING_REVIEW");

  return (
    <div className="flex flex-col gap-6">
      {/* إشعار واضح بعدد الطلبات الجديدة التي تنتظر إجراء الأدمن */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-slate-900">
          كل الطلبات
          <CountBadge count={pendingCount} />
        </h1>
        {pendingCount > 0 ? (
          <Link
            href="/admin?status=PENDING_REVIEW"
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700"
          >
            لديك {pendingCount} طلب بانتظار مراجعتك ←
          </Link>
        ) : null}
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="قيد المراجعة" value={pendingCount} tone="alert" href="/admin?status=PENDING_REVIEW" />
        <StatCard label="قيد المعالجة" value={countBy("IN_PROGRESS")} tone="info" href="/admin?status=IN_PROGRESS" />
        <StatCard label="مُصعّد لوكيل التدريب" value={countBy("ESCALATED")} tone="purple" href="/admin?status=ESCALATED" />
        <StatCard label="منتهي" value={countBy("COMPLETED")} tone="success" href="/admin?status=COMPLETED" />
        <StatCard label="مرفوض" value={countBy("REJECTED")} href="/admin?status=REJECTED" />
      </section>

      <Card>
        <CardHeader title="تصفية الطلبات" subtitle="فلترة بالحالة والنوع والتخصص، وبحث بالاسم أو الرقم التدريبي" />
        <RequestFilters action="/admin" specialties={specialties} current={filters} />
      </Card>

      <Card>
        <CardHeader title={`النتائج (${requests.length})`} />
        <RequestsTable requests={requests} basePath="/admin/requests" />
      </Card>
    </div>
  );
}
