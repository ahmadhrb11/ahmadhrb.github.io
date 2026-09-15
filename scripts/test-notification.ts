/**
 * أداة تطوير: إرسال إيميل حاوية تجريبي واحد عبر Resend إلى صندوق التتابع.
 *
 * تتيح التأكد من وصول الإيميل للصندوق ومن شكل المتن قبل بناء الـ Flow.
 * تطبع أيضًا العنوان والمتن كما سيصلان، لتنسخهما في قواعد التحليل.
 *
 * الاستخدام:
 *   npm run notify:test                          # افتراضي: حدث new_request لمسؤول النظام
 *   npm run notify:test -- approved trainee      # تحديد الحدث والدور
 */
import {
  buildContainerEmail,
  sendNotification,
  type NotificationEventType,
  type NotificationPayload,
  type RecipientRole,
} from "../src/lib/notifications";

const [eventArg, roleArg, emailArg] = process.argv.slice(2);

const eventType = (eventArg ?? "new_request") as NotificationEventType;
const recipientRole = (roleArg ?? "admin") as RecipientRole;
const recipientEmail = emailArg ?? "442412001@tvtc.edu.sa";

const base = (process.env.APP_BASE_URL || process.env.AUTH_URL || "http://localhost:3000").replace(/\/+$/, "");

async function main() {
  if (!process.env.RESEND_API_KEY?.trim() || !process.env.NOTIFICATIONS_RELAY_EMAIL?.trim()) {
    console.error("❌ RESEND_API_KEY أو NOTIFICATIONS_RELAY_EMAIL غير مضبوط في .env — لا شيء لإرساله.");
    process.exit(1);
  }

  const payload: NotificationPayload = {
      eventType,
    requestId: "test-request-id",
    studentName: "متدرب تجريبي",
    trainingNumber: "442412001",
    specialization: "تقنية معلومات",
    requestType: "طلب",
      recipientEmail,
      recipientRole,
    message: "هذه رسالة اختبارية للتحقق من عمل الـ Flow ومطابقة الحقول.",
    requestUrl: `${base}/admin/requests/test-request-id`,
  };

  const { subject, text } = buildContainerEmail(payload);
  console.log("سيُرسل إلى صندوق التتابع:", process.env.NOTIFICATIONS_RELAY_EMAIL);
  console.log(`\n--- Subject ---\n${subject}\n\n--- Body ---\n${text}\n`);

  await sendNotification([payload]);

  console.log("تم إنهاء المحاولة. راجع صندوق التتابع وسجل Resend للتأكد من وصولها.");
}

main().catch((error) => {
  console.error("فشل غير متوقع:", error);
  process.exit(1);
});
