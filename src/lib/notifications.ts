/**
 * طبقة الإشعارات البريدية — إرسال مباشر عبر Gmail SMTP.
 *
 * عند وقوع حدث يُرسَل إيميل عربي منسّق (RTL) إلى المستلم الفعلي مباشرةً
 * عبر حساب Gmail، بلا أي وسيط. بناء الإيميل في buildEmail، والإرسال في
 * sendNotification.
 *
 * ثلاث ضمانات أساسية:
 *   1. لا ترمي هذه الطبقة استثناءً أبدًا — فشل الإشعار لا يفشل أي عملية.
 *   2. لكل مستلم إيميل مستقل بـ try/catch مستقل — فشل مستلم لا يمنع الباقي.
 *   3. بلا GMAIL_USER أو GMAIL_APP_PASSWORD تُعطَّل الميزة بتحذير واحد،
 *      بلا أي محاولة اتصال.
 */
import type { Prisma } from "@prisma/client";
import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";
import { TYPE_LABELS } from "@/lib/constants";

/** اسم المرسِل الظاهر في صندوق المستلم */
const DEFAULT_FROM_NAME = "نظام استفسارات المتدربين";

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
 * تهريب HTML — إلزامي لكل قيمة تدخل القالب.
 * نص الرد وسبب الرفض يكتبهما المستخدم، فأي وسم فيهما يجب أن يظهر نصًّا لا كودًا.
 */
function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * موضوع ثابت لكل حدث — لا يحوي أي نص يكتبه المستخدم،
 * فلا يمكن حقن شيء في ترويسة الموضوع.
 */
function subjectFor(payload: NotificationPayload): string {
  switch (payload.eventType) {
    case "new_request":
      return "طلب جديد بانتظار مراجعتك";
    case "approved":
      return payload.recipientRole === "trainee"
        ? "تمت الموافقة على طلبك"
        : "طلب جديد محوّل إليك";
    case "rejected":
      return "تم رفض طلبك";
    case "department_reply":
      return "رد جديد على طلبك";
    case "trainee_reply":
      return "رد جديد من المتدرب على الطلب";
    case "escalated":
      return "تم تصعيد طلب متدرب";
    case "closed":
      return "تم إنهاء طلبك";
  }
}

/** صفوف جدول التفاصيل — المتدرب يعرف بياناته، فتُعرض للإداريين فقط */
function detailRows(payload: NotificationPayload): [string, string][] {
  const rows: [string, string][] = [];
  if (payload.recipientRole !== "trainee") {
    rows.push(["اسم المتدرب", payload.studentName]);
    rows.push(["الرقم التدريبي", payload.trainingNumber]);
  }
  rows.push(["التخصص", payload.specialization]);
  rows.push(["نوع الطلب", payload.requestType]);
  return rows;
}

/** نص الزر حسب الدور */
function buttonLabel(payload: NotificationPayload): string {
  return payload.recipientRole === "trainee" ? "متابعة طلبي" : "فتح الطلب";
}

/**
 * بناء الإيميل: موضوع ثابت، ونسخة HTML عربية RTL، ونسخة نصية بنفس المحتوى.
 *
 * القالب بجداول وأنماط inline عمدًا — عملاء البريد (Outlook خصوصًا) لا
 * يدعمون flex/grid ولا أوراق الأنماط الخارجية بشكل موثوق.
 *
 * مُصدَّرة ليُختبر شكلها دون إرسال.
 */
export function buildEmail(payload: NotificationPayload): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = subjectFor(payload);
  const rows = detailRows(payload);
  const label = buttonLabel(payload);

  // كل قيمة تمر عبر escapeHtml بلا استثناء، بما فيها الرابط
  const safeMessage = escapeHtml(payload.message);
  const safeUrl = escapeHtml(payload.requestUrl);
  const safeSubject = escapeHtml(subject);

  const rowsHtml = rows
    .map(
      ([key, value]) => `
            <tr>
              <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;white-space:nowrap;">${escapeHtml(key)}</td>
              <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
            </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeSubject}</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;font-family:'Segoe UI',Tahoma,Arial,sans-serif;text-align:right;">

          <tr>
            <td style="background-color:#0369a1;padding:18px 24px;color:#ffffff;font-size:16px;font-weight:700;">
              ${escapeHtml(DEFAULT_FROM_NAME)}
            </td>
          </tr>

          <tr>
            <td style="padding:24px 24px 8px 24px;">
              <h1 style="margin:0;font-size:19px;font-weight:700;color:#0f172a;">${safeSubject}</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 20px 24px;">
              <p style="margin:0;font-size:15px;line-height:1.9;color:#334155;">${safeMessage}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 20px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:8px;">
                ${rowsHtml}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 28px 24px;">
              <a href="${safeUrl}" style="display:inline-block;background-color:#0369a1;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:700;">${escapeHtml(label)}</a>
            </td>
          </tr>

          <tr>
            <td style="background-color:#f8fafc;padding:16px 24px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;line-height:1.8;">
              رسالة آلية من نظام استفسارات المتدربين — يرجى عدم الرد عليها.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    subject,
    "",
    payload.message,
    "",
    ...rows.map(([key, value]) => `${key}: ${value}`),
    "",
    `${label}: ${payload.requestUrl}`,
    "",
    "رسالة آلية من نظام استفسارات المتدربين — يرجى عدم الرد عليها.",
  ].join("\n");

  return { subject, text, html };
}

/** ناقل Nodemailer يُعاد استخدامه داخل نفس الـ instance */
let cachedTransporter: Transporter | null = null;

function getTransporter(user: string, pass: string): Transporter {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
      // مهل قصيرة حتى لا يعلّق Gmail البطيء الطلب على Vercel
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return cachedTransporter;
}

/**
 * الدالة العامة: ترسل إيميلًا مستقلًا لكل مستلم مباشرةً إلى بريده.
 * لا ترمي استثناءً في أي حال، ولا تعيد المحاولة (الإشعار ليس حرجًا).
 */
export async function sendNotification(payloads: NotificationPayload[]): Promise<void> {
  if (payloads.length === 0) return;

  const gmailUser = process.env.GMAIL_USER?.trim();
  // Google تعرض كلمة مرور التطبيق مجزّأة بمسافات — تُزال كلها قبل الاستخدام
  const gmailPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");

  if (!gmailUser || !gmailPassword) {
    const missing = [
      !gmailUser ? "GMAIL_USER" : null,
      !gmailPassword ? "GMAIL_APP_PASSWORD" : null,
    ]
      .filter(Boolean)
      .join(" و");
    console.warn(`[notifications] ${missing} غير مضبوط — تم تخطّي إرسال الإشعارات.`);
    return;
  }

  const fromName = process.env.MAIL_FROM_NAME?.trim() || DEFAULT_FROM_NAME;
  const transporter = getTransporter(gmailUser, gmailPassword);

  for (const payload of payloads) {
    if (!payload.recipientEmail) {
      console.error(
        `[notifications] تخطّي مستلم بلا بريد (${payload.recipientRole}) للحدث ${payload.eventType}`
      );
      continue;
    }

    const { subject, text, html } = buildEmail(payload);

    // try/catch مستقل لكل مستلم: فشل واحد لا يمنع البقية
    try {
      await transporter.sendMail({
        from: { name: fromName, address: gmailUser },
        to: payload.recipientEmail,
        subject,
        text,
        html,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(
        `[notifications] فشل إرسال ${payload.eventType} إلى ${payload.recipientEmail}: ${reason}`
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
