"use server";

/**
 * إجراءات دورة حياة الطلب: التقديم (عام) والموافقة/الرفض/الإنهاء/الحذف (الأدمن).
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { shortId } from "@/lib/format";
import { requireRole } from "@/lib/guards";
import {
  notifiableRequestSelect,
  notifyNewRequestSubmitted,
  notifyRequestApproved,
  notifyRequestClosed,
  notifyRequestRejected,
} from "@/lib/notifications";
import {
  buildTraineeEmail,
  rejectSchema,
  submitRequestSchema,
  zodFieldErrors,
  type ActionState,
} from "@/lib/validation";

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

  // البريد يُبنى في الخادم حصرًا بعد نجاح التحقق — لا تصل أي قيمة له من الواجهة
  const traineeEmail = buildTraineeEmail(data.traineeNumber);

  const created = await prisma.request.create({
    data: {
      traineeName: data.traineeName,
      traineeNumber: data.traineeNumber,
      traineeEmail,
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

  // الإشعار يُرسل بعد إرسال الاستجابة عبر after() — لا يؤخّر المستخدم،
  // وعلى بيئات serverless لا يُقتل الطلب قبل اكتماله كما يحدث مع الوعد غير المنتظَر.
  after(async () => {
    const notifiable = await prisma.request.findUnique({
      where: { id: created.id },
      select: notifiableRequestSelect,
    });
    if (notifiable) await notifyNewRequestSubmitted(notifiable);
  });

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

  after(async () => {
    const notifiable = await prisma.request.findUnique({
      where: { id: requestId },
      select: notifiableRequestSelect,
    });
    if (notifiable) await notifyRequestApproved(notifiable, head.name);
  });

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

  after(async () => {
    const notifiable = await prisma.request.findUnique({
      where: { id: requestId },
      select: notifiableRequestSelect,
    });
    if (notifiable) await notifyRequestRejected(notifiable, reason);
  });

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

  after(async () => {
    const notifiable = await prisma.request.findUnique({
      where: { id: requestId },
      select: notifiableRequestSelect,
    });
    if (notifiable) await notifyRequestClosed(notifiable);
  });

  return { ok: true, message: "تم إنهاء الطلب" };
}

/**
 * حذف نهائي للطلب وكل آثاره — لمسؤول النظام وحده.
 * لا يوجد قيد على الحالة: أي طلب في أي حالة من الحالات الخمس قابل للحذف،
 * بخلاف الموافقة والرفض والإنهاء التي تشترط حالة معيّنة.
 * عملية غير قابلة للتراجع: لا نسخة محفوظة ولا سجل حذف ولا إشعار لأي طرف.
 */
export async function deleteRequestAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const requestId = String(formData.get("requestId") ?? "");

  const request = await prisma.request.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      traineeNumber: true,
      status: true,
      _count: { select: { messages: true, events: true } },
    },
  });
  if (!request) return { ok: false, message: "الطلب غير موجود — ربما حُذف مسبقًا" };

  // الحذف صريح وبترتيب الأبناء قبل الأب، ولا يعتمد على onDelete: Cascade المعلَن في
  // الـ schema: الـ cascade في SQLite لا ينفَّذ إلا مع PRAGMA foreign_keys=ON على
  // الاتصال نفسه، وهو غير مضمون عبر محوّل libSQL/Turso في الإنتاج. ولو كان مُطفأً
  // لنجح حذف الطلب وبقيت رسائله وسجل حالته صفوفًا يتيمة — أي يبقى الأثر في المكان
  // الوحيد الذي يهم. الجمل الثلاث تعطي النتيجة ذاتها في الحالتين.
  await prisma.$transaction([
    prisma.message.deleteMany({ where: { requestId } }),
    prisma.requestEvent.deleteMany({ where: { requestId } }),
    prisma.request.delete({ where: { id: requestId } }),
  ]);

  // الأثر الوحيد الباقي بعد الحذف: سطر في سجلات الخادم (Vercel Logs).
  // لا يُحفظ شيء في قاعدة البيانات، ولا تُكتب هنا أي بيانات حسّاسة.
  console.warn(
    `[request.deleted] ref=${shortId(request.id)} traineeNumber=${request.traineeNumber} ` +
      `status=${request.status} messages=${request._count.messages} events=${request._count.events} ` +
      `by=${admin.email} at=${new Date().toISOString()}`
  );

  revalidatePath("/admin");
  revalidatePath("/admin/dashboard");
  revalidatePath("/department");
  revalidatePath("/deputy");

  // صفحة تفاصيل الطلب التي ضغط الأدمن الزر فيها لم تبق موجودة، فلا يصحّ إرجاع
  // حالة نجاح إليها — نعيده إلى اللوحة مع مرجع الطلب المحذوف ليظهر شريط التأكيد.
  redirect(`/admin?deleted=${shortId(request.id)}`);
}
