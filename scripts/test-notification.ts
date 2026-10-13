/**
 * أداة تطوير: معاينة أو إرسال إشعار تجريبي واحد.
 *
 * الاستخدام:
 *   npm run notify:test -- --dry                      # معاينة فقط، بلا شبكة وبلا أسرار
 *   npm run notify:test                               # إرسال فعلي: new_request ← admin
 *   npm run notify:test -- approved trainee           # تحديد الحدث والدور
 *   npm run notify:test -- closed trainee a@b.com     # تحديد البريد أيضًا
 */
import { writeFileSync } from "node:fs";
import {
  buildEmail,
  sendNotification,
  type NotificationEventType,
  type NotificationPayload,
  type RecipientRole,
} from "../src/lib/notifications";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry");
const [eventArg, roleArg, emailArg] = args.filter((a) => a !== "--dry");

const eventType = (eventArg ?? "new_request") as NotificationEventType;
const recipientRole = (roleArg ?? "admin") as RecipientRole;
const recipientEmail = emailArg ?? process.env.GMAIL_USER?.trim() ?? "";

const base = (process.env.APP_BASE_URL || process.env.AUTH_URL || "http://localhost:3000").replace(
  /\/+$/,
  ""
);

const PREVIEW_FILE = "notification-preview.html";

async function main() {
  const payload: NotificationPayload = {
    eventType,
    requestId: "test-request-id",
    studentName: "عبدالله الزهراني",
    trainingNumber: "442412001",
    specialization: "تقنية معلومات",
    requestType: "طلب",
    recipientEmail,
    recipientRole,
    message:
      "هذه رسالة اختبارية للتحقق من شكل الإشعار وتنسيقه قبل الاعتماد عليه في الإنتاج.",
    requestUrl:
      recipientRole === "trainee"
        ? `${base}/track/442412001/test-request-id`
        : `${base}/admin/requests/test-request-id`,
  };

  const { subject, text, html } = buildEmail(payload);

  console.log(`الحدث: ${eventType} · الدور: ${recipientRole}`);
  console.log(`\n--- الموضوع ---\n${subject}`);
  console.log(`\n--- النص العادي ---\n${text}\n`);

  // المعاينة لا تلمس الشبكة ولا تشترط أي سرّ
  if (dryRun) {
    writeFileSync(PREVIEW_FILE, html, "utf8");
    console.log(`✅ حُفظت المعاينة في ${PREVIEW_FILE} — افتحها بالمتصفح. لم يُرسل أي بريد.`);
    return;
  }

  const missing = [
    !process.env.GMAIL_USER?.trim() ? "GMAIL_USER" : null,
    !process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "") ? "GMAIL_APP_PASSWORD" : null,
    !recipientEmail ? "بريد المستلم (مرّره كوسيط ثالث أو اضبط GMAIL_USER)" : null,
  ].filter(Boolean);

  if (missing.length > 0) {
    console.error(`❌ ناقص: ${missing.join(" · ")}`);
    console.error("   استخدم --dry للمعاينة بلا إرسال.");
    process.exit(1);
  }

  console.log(`إرسال فعلي إلى: ${recipientEmail} ...`);
  await sendNotification([payload]);
  console.log("تم إنهاء المحاولة. راجع صندوق الوارد (ومجلد Junk) للتأكد.");
}

main().catch((error) => {
  console.error("فشل غير متوقع:", error);
  process.exit(1);
});
