/**
 * طبقة الإشعارات البريدية عبر Power Automate.
 *
 * الكود هنا لا يرسل بريدًا بنفسه: يرسل طلب HTTP POST واحدًا لكل مستلم إلى
 * رابط Flow موحّد، والـ Flow هو من يبني الرسالة ويرسلها عبر Office 365
 * (يفرّع على حقل recipientRole داخل Power Automate، لا هنا).
 *
 * ثلاث ضمانات أساسية:
 *   1. لا ترمي هذه الطبقة استثناءً أبدًا — فشل الإشعار لا يفشل أي عملية.
 *   2. لكل مستلم طلب مستقل بـ try/catch مستقل — فشل مستلم لا يمنع الباقي.
 *   3. بلا رابط مضبوط تُعطَّل الميزة بالكامل بتحذير واحد، بلا أي أثر آخر.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TYPE_LABELS } from "@/lib/constants";

/** مهلة كل طلب — حتى لا يعلّق Power Automate البطيء أي شيء */
const REQUEST_TIMEOUT_MS = 8000;

export type NotificationEventType =
  | "new_request"
  | "approved"
  | "rejected"
  | "department_reply"
  | "trainee_reply"
  | "escalated"
  | "closed";

export type RecipientRole = "trainee" | "admin" | "department_head" | "training_deputy";

/**
 * بنية الـ payload المتفق عليها مع محفّز Power Automate.
 * أسماء الحقول هنا تتبع عقد الـ Flow عمدًا (studentName / trainingNumber /
 * specialization) وتختلف عن التسمية الداخلية في الكود (traineeName / ...).
 */
export type NotificationPayload = {
  eventType: NotificationEventType;
  requestId: string;
  studentName: string;
  trainingNumber: string;
  specialization: string;
  requestType: string;
  recipientEmail: string;
  recipientRole: RecipientRole;
  message: string;
  requestUrl: string;
};

/** الحد الأدنى من بيانات الطلب اللازم لبناء أي إشعار */
export type NotifiableRequest = Prisma.RequestGetPayload<{
  select: {
    id: true;
    traineeName: true;
    traineeNumber: true;
    traineeEmail: true;
    type: true;
    status: true;
    assignedHeadId: true;
    specialty: { select: { name: true } };
  };
}>;

/** حقول الطلب التي تحتاجها الإشعارات — تُعاد استخدامها في كل استعلام */
export const notifiableRequestSelect = {
  id: true,
  traineeName: true,
  traineeNumber: true,
  traineeEmail: true,
  type: true,
  status: true,
  assignedHeadId: true,
  specialty: { select: { name: true } },
} as const;

/** عنوان الموقع الأساسي — APP_BASE_URL إن وُجد، وإلا AUTH_URL، وإلا التطوير المحلي */
function baseUrl(): string {
  const url = process.env.APP_BASE_URL || process.env.AUTH_URL || "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

/** رابط صفحة الطلب في اللوحة المناسبة لكل دور */
function requestUrlFor(role: RecipientRole, request: NotifiableRequest): string {
  const base = baseUrl();
  switch (role) {
    case "trainee":
      return `${base}/track/${encodeURIComponent(request.traineeNumber)}/${request.id}`;
    case "admin":
      return `${base}/admin/requests/${request.id}`;
    case "department_head":
      return `${base}/department/requests/${request.id}`;
    case "training_deputy":
      return `${base}/deputy/requests/${request.id}`;
  }
}

/** بناء payload لمستلم واحد */
function buildPayload(
  eventType: NotificationEventType,
  request: NotifiableRequest,
  recipientEmail: string,
  recipientRole: RecipientRole,
  message: string
): NotificationPayload {
  return {
    eventType,
    requestId: request.id,
    studentName: request.traineeName,
    trainingNumber: request.traineeNumber,
    specialization: request.specialty.name,
    requestType: TYPE_LABELS[request.type],
    recipientEmail,
    recipientRole,
    message,
    requestUrl: requestUrlFor(recipientRole, request),
  };
}

/**
 * الدالة العامة: ترسل POST مستقلًا لكل مستلم.
 * لا ترمي استثناءً في أي حال، ولا تعيد المحاولة (الإشعار ليس حرجًا).
 */
export async function sendNotification(payloads: NotificationPayload[]): Promise<void> {
  const webhookUrl = process.env.POWER_AUTOMATE_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    // الميزة معطّلة بالكامل — تحذير واحد وخروج فوري بلا أي محاولة إرسال
    console.warn(
      "[notifications] POWER_AUTOMATE_WEBHOOK_URL غير مضبوط — تم تخطّي إرسال الإشعارات."
    );
    return;
  }

  for (const payload of payloads) {
    if (!payload.recipientEmail) {
      console.error(
        `[notifications] تخطّي مستلم بلا بريد (${payload.recipientRole}) للحدث ${payload.eventType}`
      );
      continue;
    }

    // try/catch مستقل لكل مستلم: فشل واحد لا يمنع البقية
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        console.error(
          `[notifications] فشل الإرسال إلى ${payload.recipientEmail} (${payload.eventType}): HTTP ${response.status}`
        );
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(
        `[notifications] خطأ أثناء الإرسال إلى ${payload.recipientEmail} (${payload.eventType}): ${reason}`
      );
    }
  }
}

// ---------------------------------------------------------------
//  قراءة بريد المستلمين من قاعدة البيانات
// ---------------------------------------------------------------

/** كل الحسابات المفعّلة بدور معيّن */
async function activeEmailsByRole(role: "ADMIN" | "DEPUTY"): Promise<string[]> {
  try {
    const users = await prisma.user.findMany({
      where: { role, isActive: true },
      select: { email: true },
    });
    return users.map((user) => user.email);
  } catch (error) {
    console.error(`[notifications] تعذّر جلب بريد أصحاب الدور ${role}:`, error);
    return [];
  }
}

/** بريد رئيس القسم المعيَّن على الطلب */
async function assignedHeadEmail(request: NotifiableRequest): Promise<string | null> {
  if (!request.assignedHeadId) return null;
  try {
    const head = await prisma.user.findUnique({
      where: { id: request.assignedHeadId },
      select: { email: true, isActive: true },
    });
    return head?.isActive ? head.email : null;
  } catch (error) {
    console.error("[notifications] تعذّر جلب بريد رئيس القسم:", error);
    return null;
  }
}

/** اقتطاف مختصر من نص رسالة ليُعرض داخل الإيميل */
function excerpt(text: string, max = 300): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length <= max ? clean : `${clean.slice(0, max)}…`;
}

// ---------------------------------------------------------------
//  دوال الأحداث السبعة
// ---------------------------------------------------------------

/** تقديم طلب جديد ⇐ كل مسؤولي النظام المفعّلين */
export async function notifyNewRequestSubmitted(request: NotifiableRequest): Promise<void> {
  const admins = await activeEmailsByRole("ADMIN");
  const message = `طلب جديد من المتدرب ${request.traineeName} (${request.traineeNumber}) بحالة «قيد المراجعة» وينتظر قرارك.`;
  await sendNotification(
    admins.map((email) => buildPayload("new_request", request, email, "admin", message))
  );
}

/** موافقة الأدمن ⇐ المتدرب + رئيس القسم المعيَّن */
export async function notifyRequestApproved(
  request: NotifiableRequest,
  headName: string
): Promise<void> {
  const headEmail = await assignedHeadEmail(request);
  const payloads: NotificationPayload[] = [
    buildPayload(
      "approved",
      request,
      request.traineeEmail,
      "trainee",
      `تمت الموافقة على طلبك وتحويله إلى رئيس قسم ${request.specialty.name}: ${headName}. حالة الطلب الآن «قيد المعالجة»، ويمكنك متابعة المحادثة والرد عليها.`
    ),
  ];

  if (headEmail) {
    payloads.push(
      buildPayload(
        "approved",
        request,
        headEmail,
        "department_head",
        `تم تحويل طلب جديد إليك من المتدرب ${request.traineeName} (${request.traineeNumber}) وينتظر ردّك.`
      )
    );
  }

  await sendNotification(payloads);
}

/** رفض الأدمن ⇐ المتدرب فقط، مع السبب */
export async function notifyRequestRejected(
  request: NotifiableRequest,
  reason: string
): Promise<void> {
  await sendNotification([
    buildPayload(
      "rejected",
      request,
      request.traineeEmail,
      "trainee",
      `تم رفض طلبك. السبب: ${excerpt(reason)}`
    ),
  ]);
}

/** رد رئيس القسم أو وكيل التدريب أو مسؤول النظام ⇐ المتدرب فقط */
export async function notifyDepartmentReply(
  request: NotifiableRequest,
  senderName: string,
  messageBody: string
): Promise<void> {
  await sendNotification([
    buildPayload(
      "department_reply",
      request,
      request.traineeEmail,
      "trainee",
      `لديك رد جديد على طلبك من ${senderName}: ${excerpt(messageBody)}`
    ),
  ]);
}

/** رد المتدرب ⇐ المسؤول الحالي عن الطلب + نسخة لكل مسؤولي النظام */
export async function notifyTraineeReply(
  request: NotifiableRequest,
  messageBody: string
): Promise<void> {
  const message = `رد جديد من المتدرب ${request.traineeName} (${request.traineeNumber}): ${excerpt(messageBody)}`;
  const payloads: NotificationPayload[] = [];

  // المسؤول الحالي يتحدد بحالة الطلب: رئيس القسم قبل التصعيد، الوكيل بعده
  if (request.status === "ESCALATED") {
    const deputies = await activeEmailsByRole("DEPUTY");
    for (const email of deputies) {
      payloads.push(buildPayload("trainee_reply", request, email, "training_deputy", message));
    }
  } else {
    const headEmail = await assignedHeadEmail(request);
    if (headEmail) {
      payloads.push(
        buildPayload("trainee_reply", request, headEmail, "department_head", message)
      );
    }
  }

  // نسخة لمسؤولي النظام دائمًا
  const admins = await activeEmailsByRole("ADMIN");
  for (const email of admins) {
    payloads.push(buildPayload("trainee_reply", request, email, "admin", message));
  }

  await sendNotification(payloads);
}

/** التصعيد التلقائي ⇐ وكلاء التدريب + نسخة لمسؤولي النظام (المتدرب لا يُشعَر) */
export async function notifyEscalation(
  request: NotifiableRequest,
  reason: string
): Promise<void> {
  const message = `تم تصعيد طلب المتدرب ${request.traineeName} (${request.traineeNumber}) تلقائيًا بسبب ${reason}.`;
  const payloads: NotificationPayload[] = [];

  const deputies = await activeEmailsByRole("DEPUTY");
  for (const email of deputies) {
    payloads.push(buildPayload("escalated", request, email, "training_deputy", message));
  }

  const admins = await activeEmailsByRole("ADMIN");
  for (const email of admins) {
    payloads.push(buildPayload("escalated", request, email, "admin", message));
  }

  await sendNotification(payloads);
}

/** إنهاء الأدمن للطلب يدويًا ⇐ المتدرب */
export async function notifyRequestClosed(request: NotifiableRequest): Promise<void> {
  await sendNotification([
    buildPayload(
      "closed",
      request,
      request.traineeEmail,
      "trainee",
      "تم إنهاء طلبك من قِبل مسؤول النظام. لا يمكن إضافة ردود جديدة عليه، ويمكنك الاطلاع على المحادثة كاملة."
    ),
  ]);
}
