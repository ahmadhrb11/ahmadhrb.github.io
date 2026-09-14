/**
 * أداة تطوير: إرسال payload تجريبي واحد إلى رابط Power Automate المضبوط.
 *
 * تتيح اختبار الـ Flow ومطابقة schema المحفّز قبل ربطه بالنظام الفعلي.
 *
 * الاستخدام:
 *   npm run notify:test                          # افتراضي: حدث new_request لمسؤول النظام
 *   npm run notify:test -- approved trainee      # تحديد الحدث والدور
 */
import { sendNotification, type NotificationEventType, type RecipientRole } from "../src/lib/notifications";

const [eventArg, roleArg, emailArg] = process.argv.slice(2);

const eventType = (eventArg ?? "new_request") as NotificationEventType;
const recipientRole = (roleArg ?? "admin") as RecipientRole;
const recipientEmail = emailArg ?? "442412001@tvtc.edu.sa";

const base = (process.env.APP_BASE_URL || process.env.AUTH_URL || "http://localhost:3000").replace(/\/+$/, "");

async function main() {
  if (!process.env.POWER_AUTOMATE_WEBHOOK_URL?.trim()) {
    console.error("❌ POWER_AUTOMATE_WEBHOOK_URL غير مضبوط في .env — لا شيء لإرساله.");
    process.exit(1);
  }

  console.log(`إرسال payload تجريبي: ${eventType} ← ${recipientRole} (${recipientEmail})\n`);

  await sendNotification([
    {
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
    },
  ]);

  console.log("\nتم إنهاء المحاولة. راجع سجل التشغيل في Power Automate للتأكد من وصولها.");
}

main().catch((error) => {
  console.error("فشل غير متوقع:", error);
  process.exit(1);
});
