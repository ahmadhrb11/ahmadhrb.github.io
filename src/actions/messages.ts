"use server";

/**
 * إجراءات المحادثة (thread) — إرسال الرسائل من المتدرب ومن الموظفين.
 * كل إجراء يتحقق من الصلاحية ومن كون الطلب ما زال يقبل ردودًا.
 */
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/guards";
import { messageSchema, zodFieldErrors, type ActionState } from "@/lib/validation";
import { OPEN_CONVERSATION_STATUSES } from "@/lib/constants";
import {
  notifiableRequestSelect,
  notifyDepartmentReply,
  notifyTraineeReply,
} from "@/lib/notifications";

/**
 * رسالة من المتدرب عبر /track.
 * لا توجد جلسة، لذا نتحقق من تطابق الرقم التدريبي مع الطلب
 * حتى لا يستطيع أحد الرد على طلب لا يخصّه بتبديل المعرّف في الرابط.
 */
export async function traineeMessageAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = messageSchema.safeParse({
    requestId: formData.get("requestId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, message: "تعذّر إرسال الرسالة", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const traineeNumber = String(formData.get("traineeNumber") ?? "").trim();
  const request = await prisma.request.findUnique({ where: { id: parsed.data.requestId } });

  if (!request || request.traineeNumber !== traineeNumber) {
    return { ok: false, message: "الطلب غير موجود" };
  }
  if (!OPEN_CONVERSATION_STATUSES.includes(request.status)) {
    return { ok: false, message: "هذا الطلب لا يقبل ردودًا جديدة في حالته الحالية" };
  }

  await prisma.message.create({
    data: {
      requestId: request.id,
      senderRole: "TRAINEE",
      senderName: request.traineeName,
      body: parsed.data.body,
    },
  });

  // ملاحظة: ردّ المتدرب لا يُحدّث lastHeadReplyAt — مؤقّت التصعيد يعتمد على رد رئيس القسم فقط.
  after(async () => {
    const notifiable = await prisma.request.findUnique({
      where: { id: request.id },
      select: notifiableRequestSelect,
    });
    if (notifiable) await notifyTraineeReply(notifiable, parsed.data.body);
  });

  revalidatePath(`/track/${encodeURIComponent(traineeNumber)}/${request.id}`);
  revalidatePath(`/admin/requests/${request.id}`);
  revalidatePath("/department");
  revalidatePath("/deputy");
  return { ok: true, message: "تم إرسال ردّك" };
}

/**
 * رسالة من الموظف المسؤول حاليًا عن الطلب:
 * - رئيس القسم: فقط على طلباته وبحالة «قيد المعالجة» (يفقد حق الرد بعد التصعيد).
 * - وكيل التدريب: فقط على الطلبات بحالة «مُصعّد لوكيل التدريب».
 * - مسؤول النظام: يستطيع المشاركة في أي محادثة مفتوحة.
 */
export async function staffMessageAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "يجب تسجيل الدخول" };

  const parsed = messageSchema.safeParse({
    requestId: formData.get("requestId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, message: "تعذّر إرسال الرسالة", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const request = await prisma.request.findUnique({ where: { id: parsed.data.requestId } });
  if (!request) return { ok: false, message: "الطلب غير موجود" };

  if (!OPEN_CONVERSATION_STATUSES.includes(request.status)) {
    return { ok: false, message: "هذا الطلب مغلق ولا يقبل ردودًا جديدة" };
  }

  // التحقق من أن هذا المستخدم هو المسؤول الحالي عن الطلب
  if (user.role === "DEPT_HEAD") {
    if (request.assignedHeadId !== user.id) {
      return { ok: false, message: "هذا الطلب غير محوّل إليك" };
    }
    if (request.status !== "IN_PROGRESS") {
      return { ok: false, message: "تم تصعيد الطلب إلى وكيل التدريب، ولم يعد بإمكانك الرد عليه" };
    }
  } else if (user.role === "DEPUTY") {
    if (request.status !== "ESCALATED") {
      return { ok: false, message: "هذا الطلب ليس ضمن الطلبات المُصعّدة إليك" };
    }
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.message.create({
      data: {
        requestId: request.id,
        senderRole: user.role,
        senderUserId: user.id,
        senderName: user.name,
        body: parsed.data.body,
      },
    }),
    // إعادة ضبط مؤقّت التصعيد عند رد رئيس القسم فقط
    ...(user.role === "DEPT_HEAD"
      ? [prisma.request.update({ where: { id: request.id }, data: { lastHeadReplyAt: now } })]
      : []),
  ]);

  // رسالة أي طرف مسؤول (رئيس قسم أو وكيل أو مسؤول نظام) يراها المتدرب في /track،
  // فيُشعَر بها في الحالات الثلاث.
  after(async () => {
    const notifiable = await prisma.request.findUnique({
      where: { id: request.id },
      select: notifiableRequestSelect,
    });
    if (notifiable) await notifyDepartmentReply(notifiable, user.name, parsed.data.body);
  });

  revalidatePath(`/track/${encodeURIComponent(request.traineeNumber)}/${request.id}`);
  revalidatePath(`/admin/requests/${request.id}`);
  revalidatePath(`/department/requests/${request.id}`);
  revalidatePath(`/deputy/requests/${request.id}`);
  revalidatePath("/department");
  revalidatePath("/deputy");
  revalidatePath("/admin");
  return { ok: true, message: "تم إرسال الرد" };
}
