/**
 * طبقة التحليلات للوحة معلومات مسؤول النظام (/admin/dashboard).
 *
 * ملف مستقل تمامًا: كل الاستعلامات والحسابات هنا، ولا يعدّل أي منطق قائم.
 * التجميعات تُنفَّذ في قاعدة البيانات ما أمكن (groupBy)، والحسابات الزمنية
 * تُشتق من حقول موجودة أصلًا في نموذج Request (approvedAt / completedAt / ...).
 */
import type { Prisma, RequestStatus, RequestType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ESCALATION_DAYS } from "@/lib/constants";

const DAY_MS = 24 * 60 * 60 * 1000;

/** الفترات الزمنية المتاحة في فلتر لوحة المعلومات */
export const PERIODS = {
  "30": "آخر 30 يومًا",
  "90": "آخر 90 يومًا",
  "365": "آخر سنة",
  all: "كل الفترات",
} as const;

export type PeriodKey = keyof typeof PERIODS;

export function isPeriod(value: string | undefined): value is PeriodKey {
  return !!value && value in PERIODS;
}

/** بداية الفترة المختارة (null = بلا حد زمني) */
function periodStart(period: PeriodKey): Date | null {
  if (period === "all") return null;
  return new Date(Date.now() - Number(period) * DAY_MS);
}

export type StatusSlice = { status: RequestStatus; count: number };
export type TypeSlice = { type: RequestType; count: number };

export type SpecialtyRow = {
  name: string;
  headName: string | null;
  total: number;
  open: number;
  escalated: number;
  completed: number;
};

export type HeadRow = {
  name: string;
  specialties: string;
  assigned: number;
  inProgress: number;
  escalated: number;
  completed: number;
  awaitingReply: number;
  avgFirstReplyHours: number | null;
  escalationRate: number | null;
};

export type TrendPoint = { label: string; submitted: number; completed: number };

export type AtRiskRow = {
  id: string;
  traineeName: string;
  traineeNumber: string;
  specialty: string;
  headName: string | null;
  daysWaiting: number;
  daysLeft: number;
};

export type DashboardData = {
  period: PeriodKey;
  periodLabel: string;
  /** إجماليات ضمن الفترة المختارة */
  totals: {
    all: number;
    pending: number;
    inProgress: number;
    escalated: number;
    completed: number;
    rejected: number;
    open: number;
  };
  rates: {
    approval: number | null;
    completion: number | null;
    escalation: number | null;
    rejection: number | null;
  };
  durations: {
    avgResolutionDays: number | null;
    avgFirstReplyHours: number | null;
    avgReviewHours: number | null;
  };
  byStatus: StatusSlice[];
  byType: TypeSlice[];
  bySpecialty: SpecialtyRow[];
  byHead: HeadRow[];
  trend: TrendPoint[];
  /** لقطة لحظية — لا تتأثر بفلتر الفترة */
  atRisk: AtRiskRow[];
  oldestOpen: AtRiskRow[];
  messagesTotal: number;
  avgMessagesPerConversation: number | null;
};

/** متوسط مصفوفة أرقام، أو null إن كانت فارغة */
function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** نسبة مئوية آمنة من القسمة على صفر */
function rate(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return (part / whole) * 100;
}

/** تسمية عربية مختصرة لأسبوع يبدأ في تاريخ معيّن */
function weekLabel(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** بداية الأسبوع (الأحد) بتوقيت محلي، مع تصفير الوقت */
function startOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - result.getDay());
  return result;
}

export async function getDashboardData(period: PeriodKey = "90"): Promise<DashboardData> {
  const since = periodStart(period);
  const periodWhere: Prisma.RequestWhereInput = since ? { createdAt: { gte: since } } : {};

  const [requests, specialties, heads, firstHeadReplies, messagesTotal, conversationsCount] =
    await Promise.all([
      // الطلبات ضمن الفترة — حقول محدودة فقط لتخفيف الحمل
      prisma.request.findMany({
        where: periodWhere,
        select: {
          id: true,
          status: true,
          type: true,
          createdAt: true,
          approvedAt: true,
          completedAt: true,
          escalatedAt: true,
          specialtyId: true,
          assignedHeadId: true,
        },
      }),
      prisma.specialty.findMany({
        select: { id: true, name: true, head: { select: { id: true, name: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        where: { role: "DEPT_HEAD" },
        select: { id: true, name: true, headedSpecialties: { select: { name: true } } },
        orderBy: { name: "asc" },
      }),
      // أول رد من رئيس القسم على كل طلب — لحساب زمن الاستجابة
      prisma.message.groupBy({
        by: ["requestId"],
        where: { senderRole: "DEPT_HEAD" },
        _min: { createdAt: true },
      }),
      prisma.message.count({ where: { senderRole: { not: "SYSTEM" } } }),
      prisma.request.count({ where: { approvedAt: { not: null } } }),
    ]);

  const firstReplyByRequest = new Map<string, Date>();
  for (const row of firstHeadReplies) {
    if (row._min.createdAt) firstReplyByRequest.set(row.requestId, row._min.createdAt);
  }

  // ---------- الإجماليات والنِّسب ----------
  const countByStatus = (status: RequestStatus) =>
    requests.filter((request) => request.status === status).length;

  const totals = {
    all: requests.length,
    pending: countByStatus("PENDING_REVIEW"),
    inProgress: countByStatus("IN_PROGRESS"),
    escalated: countByStatus("ESCALATED"),
    completed: countByStatus("COMPLETED"),
    rejected: countByStatus("REJECTED"),
    open: 0,
  };
  totals.open = totals.pending + totals.inProgress + totals.escalated;

  // الطلبات التي بُتّ فيها (وافق عليها الأدمن أو رفضها)
  const decided = requests.filter((r) => r.approvedAt || r.status === "REJECTED").length;
  const approved = requests.filter((r) => r.approvedAt).length;

  const rates = {
    approval: rate(approved, decided),
    completion: rate(totals.completed, approved),
    escalation: rate(requests.filter((r) => r.escalatedAt).length, approved),
    rejection: rate(totals.rejected, decided),
  };

  // ---------- المدد الزمنية ----------
  const resolutionDays = requests
    .filter((r) => r.completedAt)
    .map((r) => (r.completedAt!.getTime() - r.createdAt.getTime()) / DAY_MS);

  const reviewHours = requests
    .filter((r) => r.approvedAt)
    .map((r) => (r.approvedAt!.getTime() - r.createdAt.getTime()) / (60 * 60 * 1000));

  const firstReplyHours = requests
    .filter((r) => r.approvedAt && firstReplyByRequest.has(r.id))
    .map(
      (r) =>
        (firstReplyByRequest.get(r.id)!.getTime() - r.approvedAt!.getTime()) / (60 * 60 * 1000)
    )
    .filter((hours) => hours >= 0);

  const durations = {
    avgResolutionDays: average(resolutionDays),
    avgFirstReplyHours: average(firstReplyHours),
    avgReviewHours: average(reviewHours),
  };

  // ---------- التوزيعات ----------
  const STATUS_ORDER: RequestStatus[] = [
    "PENDING_REVIEW",
    "REJECTED",
    "IN_PROGRESS",
    "ESCALATED",
    "COMPLETED",
  ];
  const byStatus: StatusSlice[] = STATUS_ORDER.map((status) => ({
    status,
    count: countByStatus(status),
  }));

  const TYPE_ORDER: RequestType[] = ["REQUEST", "COMPLAINT", "INQUIRY"];
  const byType: TypeSlice[] = TYPE_ORDER.map((type) => ({
    type,
    count: requests.filter((request) => request.type === type).length,
  })).sort((a, b) => b.count - a.count);

  const bySpecialty: SpecialtyRow[] = specialties
    .map((specialty) => {
      const rows = requests.filter((request) => request.specialtyId === specialty.id);
      return {
        name: specialty.name,
        headName: specialty.head?.name ?? null,
        total: rows.length,
        open: rows.filter((r) =>
          (["PENDING_REVIEW", "IN_PROGRESS", "ESCALATED"] as RequestStatus[]).includes(r.status)
        ).length,
        escalated: rows.filter((r) => r.escalatedAt).length,
        completed: rows.filter((r) => r.status === "COMPLETED").length,
      };
    })
    .sort((a, b) => b.total - a.total);

  const byHead: HeadRow[] = heads
    .map((head) => {
      const rows = requests.filter((request) => request.assignedHeadId === head.id);
      const headFirstReply = rows
        .filter((r) => r.approvedAt && firstReplyByRequest.has(r.id))
        .map(
          (r) =>
            (firstReplyByRequest.get(r.id)!.getTime() - r.approvedAt!.getTime()) /
            (60 * 60 * 1000)
        )
        .filter((hours) => hours >= 0);

      return {
        name: head.name,
        specialties: head.headedSpecialties.map((s) => s.name).join("، ") || "—",
        assigned: rows.length,
        inProgress: rows.filter((r) => r.status === "IN_PROGRESS").length,
        escalated: rows.filter((r) => r.escalatedAt).length,
        completed: rows.filter((r) => r.status === "COMPLETED").length,
        awaitingReply: rows.filter(
          (r) => r.status === "IN_PROGRESS" && !firstReplyByRequest.has(r.id)
        ).length,
        avgFirstReplyHours: average(headFirstReply),
        escalationRate: rate(rows.filter((r) => r.escalatedAt).length, rows.length),
      };
    })
    .sort((a, b) => b.assigned - a.assigned);

  // ---------- الاتجاه الأسبوعي (آخر 12 أسبوعًا) ----------
  const WEEKS = 12;
  const currentWeek = startOfWeek(new Date());
  const trend: TrendPoint[] = [];
  for (let i = WEEKS - 1; i >= 0; i--) {
    const weekStart = new Date(currentWeek.getTime() - i * 7 * DAY_MS);
    const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);
    trend.push({
      label: weekLabel(weekStart),
      submitted: requests.filter((r) => r.createdAt >= weekStart && r.createdAt < weekEnd).length,
      completed: requests.filter(
        (r) => r.completedAt && r.completedAt >= weekStart && r.completedAt < weekEnd
      ).length,
    });
  }

  // ---------- لقطة لحظية: طلبات تقترب من التصعيد (مستقلة عن الفترة) ----------
  const now = Date.now();
  const liveOpen = await prisma.request.findMany({
    where: { status: { in: ["IN_PROGRESS", "ESCALATED", "PENDING_REVIEW"] } },
    select: {
      id: true,
      traineeName: true,
      traineeNumber: true,
      status: true,
      createdAt: true,
      lastHeadReplyAt: true,
      specialty: { select: { name: true } },
      assignedHead: { select: { name: true } },
    },
  });

  const atRisk: AtRiskRow[] = liveOpen
    .filter((r) => r.status === "IN_PROGRESS" && r.lastHeadReplyAt)
    .map((r) => {
      const daysWaiting = (now - r.lastHeadReplyAt!.getTime()) / DAY_MS;
      return {
        id: r.id,
        traineeName: r.traineeName,
        traineeNumber: r.traineeNumber,
        specialty: r.specialty.name,
        headName: r.assignedHead?.name ?? null,
        daysWaiting,
        daysLeft: ESCALATION_DAYS - daysWaiting,
      };
    })
    // تبقّى لها أقل من يوم واحد قبل التصعيد التلقائي
    .filter((row) => row.daysLeft <= 1)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const oldestOpen: AtRiskRow[] = liveOpen
    .map((r) => ({
      id: r.id,
      traineeName: r.traineeName,
      traineeNumber: r.traineeNumber,
      specialty: r.specialty.name,
      headName: r.assignedHead?.name ?? null,
      daysWaiting: (now - r.createdAt.getTime()) / DAY_MS,
      daysLeft: 0,
    }))
    .sort((a, b) => b.daysWaiting - a.daysWaiting)
    .slice(0, 5);

  return {
    period,
    periodLabel: PERIODS[period],
    totals,
    rates,
    durations,
    byStatus,
    byType,
    bySpecialty,
    byHead,
    trend,
    atRisk,
    oldestOpen,
    messagesTotal,
    avgMessagesPerConversation:
      conversationsCount > 0 ? messagesTotal / conversationsCount : null,
  };
}
