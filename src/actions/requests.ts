"use server";

/**
 * إجراءات دورة حياة الطلب: التقديم (عام) والموافقة/الرفض/الإنهاء (الأدمن).
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { rejectSchema, submitRequestSchema, zodFieldErrors, type ActionState } from "@/lib/validation";

/** تقديم طلب جديد من صفحة /submit — متاح للجميع بدون تسجيل دخول */
export async function submitRequestAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = submitRequestSchema.safeParse({
    traineeName: formData.get("traineeName"),
    traineeNumber: formData.get("traineeNumber"),
    specialtyId: formData.get("specialtyId"),
    type: formData.get("type"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return { ok: false, message: "يرجى تصحيح الحقول المطلوبة", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const data = parsed.data;

  // التأكد من أن التخصص المختار موجود وفعّال
  const specialty = await prisma.specialty.findFirst({
    where: { id: data.specialtyId, isActive: true },
  });
  if (!specialty) {
    return { ok: false, message: "التخصص المختار غير متاح", fieldErrors: { specialtyId: "اختر تخصصًا صحيحًا" } };
  }

  const created = await prisma.request.create({
    data: {
      traineeName: data.traineeName,
      traineeNumber: data.traineeNumber,
      specialtyId: data.specialtyId,
      type: data.type,
      body: data.body,
      status: "PENDING_REVIEW",
      // نص الطلب يُسجَّل أيضًا كأول رسالة في المحادثة ليبدأ الـ thread من البداية
      messages: {
        create: {
          senderRole: "TRAINEE",
          senderName: data.traineeName,
          body: data.body,
        },
      },
      events: {
        create: {
          toStatus: "PENDING_REVIEW",
          actorRole: "TRAINEE",
          actorName: data.traineeName,
          note: "تم تقديم الطلب",
        },
      },
    },
  });

  revalidatePath("/admin");
  redirect(`/submit/success?ref=${created.id}&n=${encodeURIComponent(data.traineeNumber)}`);
}

/** موافقة الأدمن: تحويل الطلب تلقائيًا إلى رئيس القسم المرتبط بتخصص المتدرب */
export async function approveRequestAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const requestId = String(formData.get("requestId") ?? "");

  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { specialty: { include: { head: true } } },
  });

  if (!request) return { ok: false, message: "الطلب غير موجود" };
  if (request.status !== "PENDING_REVIEW") {
    return { ok: false, message: "لا يمكن الموافقة إلا على طلب بحالة «قيد المراجعة»" };
  }

  const head = request.specialty.head;
  if (!head || !head.isActive) {
    return {
      ok: false,
      message: `لا يوجد رئيس قسم مرتبط بتخصص «${request.specialty.name}». يرجى ربطه من صفحة الإعدادات أولًا.`,
    };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.request.update({
      where: { id: requestId },
      data: {
        status: "IN_PROGRESS",
        assignedHeadId: head.id,
        approvedAt: now,
        // بدء مؤقّت التصعيد من لحظة التحويل
        lastHeadReplyAt: now,
      },
    }),
    prisma.message.create({
      data: {
        requestId,
        senderRole: "SYSTEM",
        senderName: "النظام",
        body: `تمت الموافقة على الطلب وتحويله إلى رئيس قسم ${request.specialty.name}: ${head.name}.`,
      },
    }),
    prisma.requestEvent.create({
      data: {
        requestId,
        fromStatus: "PENDING_REVIEW",
        toStatus: "IN_PROGRESS",
        actorRole: "ADMIN",
        actorName: admin.name,
        note: `تحويل إلى رئيس القسم: ${head.name}`,
      },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath(`/admin/requests/${requestId}`);
  revalidatePath("/department");
  return { ok: true, message: `تمت الموافقة وتحويل الطلب إلى ${head.name}` };
}

/** رفض الأدمن مع سبب إلزامي يظهر للمتدرب في /track */
export async function rejectRequestAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireRole("ADMIN");

  const parsed = rejectSchema.safeParse({
    requestId: formData.get("requestId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { ok: false, message: "يرجى كتابة سبب الرفض", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const { requestId, reason } = parsed.data;
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) return { ok: false, message: "الطلب غير موجود" };
  if (request.status !== "PENDING_REVIEW") {
    return { ok: false, message: "لا يمكن الرفض إلا لطلب بحالة «قيد المراجعة»" };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.request.update({
      where: { id: requestId },
      data: { status: "REJECTED", rejectedAt: now, rejectionReason: reason },
    }),
    // السبب يُحفظ كرسالة أيضًا ليظهر ضمن المحادثة للمتدرب
    prisma.message.create({
      data: {
        requestId,
        senderRole: "ADMIN",
        senderUserId: admin.id,
        senderName: admin.name,
        body: reason,
      },
    }),
    prisma.requestEvent.create({
      data: {
        requestId,
        fromStatus: "PENDING_REVIEW",
        toStatus: "REJECTED",
        actorRole: "ADMIN",
        actorName: admin.name,
        note: reason,
      },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath(`/admin/requests/${requestId}`);
  return { ok: true, message: "تم رفض الطلب وإبلاغ المتدرب بالسبب" };
}

/** إنهاء الطلب يدويًا من الأدمن — يوقف المحادثة نهائيًا */
export async function completeRequestAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const requestId = String(formData.get("requestId") ?? "");

  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) return { ok: false, message: "الطلب غير موجود" };
  if (request.status !== "IN_PROGRESS" && request.status !== "ESCALATED") {
    return { ok: false, message: "لا يمكن إنهاء إلا الطلبات قيد المعالجة أو المُصعّدة" };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.request.update({
      where: { id: requestId },
      data: { status: "COMPLETED", completedAt: now },
    }),
    prisma.message.create({
      data: {
        requestId,
        senderRole: "SYSTEM",
        senderName: "النظام",
        body: `تم إنهاء الطلب بواسطة مسؤول النظام (${admin.name}). لا يمكن إضافة ردود جديدة.`,
      },
    }),
    prisma.requestEvent.create({
      data: {
        requestId,
        fromStatus: request.status,
        toStatus: "COMPLETED",
        actorRole: "ADMIN",
        actorName: admin.name,
        note: "إنهاء يدوي من لوحة مسؤول النظام",
      },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath(`/admin/requests/${requestId}`);
  revalidatePath("/department");
  revalidatePath("/deputy");
  return { ok: true, message: "تم إنهاء الطلب" };
}
