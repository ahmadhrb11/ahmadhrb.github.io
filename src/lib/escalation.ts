/**
 * منطق التصعيد التلقائي لوكيل التدريب.
 *
 * القاعدة: إذا مرّت ESCALATION_DAYS يومًا كاملة دون أي رد من *رئيس القسم* على طلب
 * حالته "قيد المعالجة" — بغضّ النظر عن عدد ردود المتدرب — يُصعَّد الطلب تلقائيًا.
 *
 * العدّاد (lastHeadReplyAt) يُضبط عند موافقة الأدمن ثم لا يُحدَّث إلا برسالة من رئيس القسم.
 *
 * تُستدعى هذه الدالة من مسار المهمة المجدولة /api/cron/escalate ومن سكربت npm run escalate.
 */
import { prisma } from "@/lib/prisma";
import { ESCALATION_DAYS } from "@/lib/constants";

export type EscalationResult = {
  escalatedCount: number;
  escalatedIds: string[];
  thresholdDays: number;
  checkedAt: string;
};

export async function runEscalation(days: number = ESCALATION_DAYS): Promise<EscalationResult> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // الطلبات قيد المعالجة التي تجاوز آخر رد من رئيس قسمها المهلة المحددة
  const dueRequests = await prisma.request.findMany({
    where: {
      status: "IN_PROGRESS",
      lastHeadReplyAt: { lt: cutoff },
    },
    select: { id: true, lastHeadReplyAt: true },
  });

  const reason = `مرور ${days} أيام دون رد من رئيس القسم`;
  const escalatedIds: string[] = [];

  for (const request of dueRequests) {
    // معاملة واحدة لكل طلب: تحديث الحالة + رسالة نظام + قيد في سجل الحالة
    await prisma.$transaction([
      prisma.request.update({
        where: { id: request.id },
        data: {
          status: "ESCALATED",
          escalatedAt: now,
          escalationReason: reason,
        },
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
  }

  return {
    escalatedCount: escalatedIds.length,
    escalatedIds,
    thresholdDays: days,
    checkedAt: now.toISOString(),
  };
}
