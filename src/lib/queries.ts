/** استعلامات مشتركة بين لوحات الموظفين */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type RequestWithRelations = Prisma.RequestGetPayload<{
  include: { specialty: true; assignedHead: true };
}>;

/**
 * يُرجع معرّفات الطلبات التي تنتظر ردًّا من المسؤول الحالي:
 * أي طلب آخر رسالة فيه ليست من `responderRole` (طلب جديد، أو رد جديد من المتدرب).
 */
export async function findAwaitingReplyIds(
  requestIds: string[],
  responderRole: "DEPT_HEAD" | "DEPUTY"
): Promise<Set<string>> {
  if (requestIds.length === 0) return new Set();

  const lastMessages = await prisma.message.findMany({
    where: { requestId: { in: requestIds } },
    orderBy: { createdAt: "desc" },
    select: { requestId: true, senderRole: true, createdAt: true },
  });

  const seen = new Map<string, string>();
  for (const message of lastMessages) {
    // القائمة مرتّبة تنازليًا، فأول ظهور لكل طلب هو آخر رسالة فيه
    if (!seen.has(message.requestId)) seen.set(message.requestId, message.senderRole);
  }

  const awaiting = new Set<string>();
  for (const requestId of requestIds) {
    const lastSender = seen.get(requestId);
    if (lastSender !== responderRole) awaiting.add(requestId);
  }
  return awaiting;
}
