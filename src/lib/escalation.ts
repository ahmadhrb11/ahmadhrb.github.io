/**
 * المهل التلقائية على الطلبات المفتوحة — قاعدة واحدة متماثلة:
 *
 *   «المهلة تجري دائمًا على من عليه الدور، ويحدّده صاحب آخر رسالة في المحادثة.»
 *
 *   ┌──────────────────────────────┬────────────────┬──────────────────────────┐
 *   │ صاحب آخر رسالة               │ الدور على      │ بعد انقضاء المهلة        │
 *   ├──────────────────────────────┼────────────────┼──────────────────────────┤
 *   │ المتدرب (أو لا رد بعد الموافقة)│ رئيس القسم    │ تصعيد لوكيل التدريب      │
 *   │ رئيس القسم أو وكيل التدريب   │ المتدرب        │ إغلاق تلقائي للطلب       │
 *   └──────────────────────────────┴────────────────┴──────────────────────────┘
 *
 * حالتان بلا مهلة عمدًا:
 *   - «قيد المراجعة»: لا مهلة على الأدمن.
 *   - «مُصعّد» والدور على الوكيل: لا جهة أعلى للتصعيد إليها، فيبقى الطلب مفتوحًا
 *     حتى يرد الوكيل أو يغلقه الأدمن يدويًا.
 *
 * رسائل الأدمن والنظام محايدة: لا تُحتسب ردًّا من أي طرف ولا تُحرّك أي ساعة.
 *
 * ملاحظة: حقل Request.lastHeadReplyAt لم يعد هو الساعة — الساعة تُشتق من
 * طوابع الرسائل. الحقل باقٍ ويُكتب كما كان، لكنه معلوماتي فقط.
 *
 * تُستدعى هذه الدالة من مسار المهمة المجدولة /api/cron/escalate ومن سكربت
 * npm run escalate.
 */
import { prisma } from "@/lib/prisma";
import { AUTO_CLOSE_DAYS, ESCALATION_DAYS } from "@/lib/constants";
import {
  notifiableRequestSelect,
  notifyEscalation,
  notifyRequestClosed,
} from "@/lib/notifications";

const DAY_MS = 24 * 60 * 60 * 1000;

export type EscalationResult = {
  escalatedCount: number;
  escalatedIds: string[];
  closedCount: number;
  closedIds: string[];
  thresholdDays: number;
  autoCloseDays: number;
  checkedAt: string;
};

/** من عليه الدور في طلب مفتوح */
type Turn = "staff" | "trainee";

export async function runEscalation(
  days: number = ESCALATION_DAYS,
  autoCloseDays: number = AUTO_CLOSE_DAYS
): Promise<EscalationResult> {
  const now = new Date();
  const escalateCutoff = new Date(now.getTime() - days * DAY_MS);
  const closeCutoff = new Date(now.getTime() - autoCloseDays * DAY_MS);

  // كل الطلبات المفتوحة؛ تحديد الدور يحتاج قراءة الرسائل لا حقلًا واحدًا
  const openRequests = await prisma.request.findMany({
    where: { status: { in: ["IN_PROGRESS", "ESCALATED"] } },
    select: { ...notifiableRequestSelect, approvedAt: true },
  });

  if (openRequests.length === 0) {
    return {
      escalatedCount: 0,
      escalatedIds: [],
      closedCount: 0,
      closedIds: [],
      thresholdDays: days,
      autoCloseDays,
      checkedAt: now.toISOString(),
    };
  }

  const ids = openRequests.map((request) => request.id);

  // استعلاما تجميع بدل قراءة كل الرسائل: آخر رد من كل طرف لكل طلب
  const [staffReplies, traineeReplies] = await Promise.all([
    prisma.message.groupBy({
      by: ["requestId"],
      where: { requestId: { in: ids }, senderRole: { in: ["DEPT_HEAD", "DEPUTY"] } },
      _max: { createdAt: true },
    }),
    prisma.message.groupBy({
      by: ["requestId"],
      where: { requestId: { in: ids }, senderRole: "TRAINEE" },
      _max: { createdAt: true },
    }),
  ]);

  const lastStaffReply = new Map<string, Date>();
  for (const row of staffReplies) {
    if (row._max.createdAt) lastStaffReply.set(row.requestId, row._max.createdAt);
  }
  const lastTraineeReply = new Map<string, Date>();
  for (const row of traineeReplies) {
    if (row._max.createdAt) lastTraineeReply.set(row.requestId, row._max.createdAt);
  }

  /**
   * من عليه الدور، ومتى بدأت ساعته.
   *
   * حين يكون الدور على المسؤول تبدأ الساعة من آخر رسالة للمتدرب أو من تاريخ
   * الموافقة، أيّهما أحدث: نص الطلب الأصلي مخزَّن كرسالة TRAINEE تسبق الموافقة،
   * فبدون هذا الاعتبار تبدأ الساعة من تاريخ التقديم لا من التحويل.
   */
  function turnOf(requestId: string, approvedAt: Date | null): { turn: Turn; since: Date } {
    const staffAt = lastStaffReply.get(requestId) ?? null;
    const traineeAt = lastTraineeReply.get(requestId) ?? null;

    const staffHasLastWord = staffAt !== null && (traineeAt === null || staffAt > traineeAt);

    if (staffHasLastWord) {
      return { turn: "trainee", since: staffAt };
    }

    const candidates = [traineeAt, approvedAt].filter((d): d is Date => d !== null);
    const since = candidates.reduce((latest, d) => (d > latest ? d : latest), candidates[0] ?? now);
    return { turn: "staff", since };
  }

  const escalatedIds: string[] = [];
  const closedIds: string[] = [];

  for (const request of openRequests) {
    const { turn, since } = turnOf(request.id, request.approvedAt);

    // ── الدور على المسؤول: تصعيد، وفقط من «قيد المعالجة» ──
    if (turn === "staff") {
      if (request.status !== "IN_PROGRESS" || since >= escalateCutoff) continue;

      const reason = `مرور ${days} أيام دون رد من رئيس القسم`;
      await prisma.$transaction([
        prisma.request.update({
          where: { id: request.id },
          data: { status: "ESCALATED", escalatedAt: now, escalationReason: reason },
        }),
        prisma.message.create({
          data: {
            requestId: request.id,
            senderRole: "SYSTEM",
            senderName: "النظام",
            body: `تم تصعيد الطلب تلقائيًا إلى وكيل التدريب بسبب ${reason}. سيتولّى وكيل التدريب متابعة الطلب من الآن.`,
          },
        }),
        prisma.requestEvent.create({
          data: {
            requestId: request.id,
            fromStatus: "IN_PROGRESS",
            toStatus: "ESCALATED",
            actorRole: "SYSTEM",
            actorName: "النظام (تصعيد تلقائي)",
            note: reason,
          },
        }),
      ]);
      escalatedIds.push(request.id);

      // تُستدعى runEscalation أيضًا من سكربت npm run escalate خارج أي طلب HTTP،
      // حيث after() غير متاحة — فالانتظار المباشر هو الصحيح هنا. دوال الإشعار
      // لا ترمي استثناءً أبدًا، فلا يمكن أن تفشل المهلة بسبب إشعار.
      await notifyEscalation({ ...request, status: "ESCALATED" }, reason);
      continue;
    }

    // ── الدور على المتدرب: إغلاق تلقائي، من «قيد المعالجة» و«مُصعّد» معًا ──
    if (since >= closeCutoff) continue;

    const reason = `مرور ${autoCloseDays} أيام دون رد من المتدرب`;
    await prisma.$transaction([
      prisma.request.update({
        where: { id: request.id },
        data: { status: "COMPLETED", completedAt: now },
      }),
      prisma.message.create({
        data: {
          requestId: request.id,
          senderRole: "SYSTEM",
          senderName: "النظام",
          body: `تم إنهاء الطلب تلقائيًا بسبب ${reason}. لا يمكن إضافة ردود جديدة عليه.`,
        },
      }),
      prisma.requestEvent.create({
        data: {
          requestId: request.id,
          fromStatus: request.status,
          toStatus: "COMPLETED",
          actorRole: "SYSTEM",
          actorName: "النظام (إغلاق تلقائي)",
          note: reason,
        },
      }),
    ]);
    closedIds.push(request.id);

    await notifyRequestClosed({ ...request, status: "COMPLETED" }, reason);
  }

  return {
    escalatedCount: escalatedIds.length,
    escalatedIds,
    closedCount: closedIds.length,
    closedIds,
    thresholdDays: days,
    autoCloseDays,
    checkedAt: now.toISOString(),
  };
}
