/** مخططات التحقق من المدخلات (Zod) — تُستخدم داخل Server Actions */
import { z } from "zod";

// ---------------------------------------------------------------
//  الرقم التدريبي وبريد المتدرب — منطق مشترك، لا يُكرَّر في أي مكان آخر
// ---------------------------------------------------------------

/** عدد خانات الرقم التدريبي */
export const TRAINEE_NUMBER_LENGTH = 9;

/**
 * 9 خانات رقمية بالضبط (0-9)، بلا حروف أو رموز أو مسافات.
 * ملاحظة: \d في JavaScript تطابق الأرقام اللاتينية فقط، فالأرقام
 * العربية-الهندية (٠١٢...) مرفوضة عمدًا لأن الرقم يُخزَّن ويُستخدم في الروابط.
 */
const TRAINEE_NUMBER_PATTERN = /^\d{9}$/;

/** الرسالة الموحّدة التي تُعرض في كل الواجهات وفي ردود الخادم */
export const TRAINEE_NUMBER_ERROR = "الرقم التدريبي يجب أن يتكون من 9 أرقام فقط";

/** الدالة الوحيدة التي يُفحص بها الرقم التدريبي في المشروع كله */
export function isValidTraineeNumber(value: string): boolean {
  return TRAINEE_NUMBER_PATTERN.test(value.trim());
}

/** نطاق بريد المتدربين */
export const TRAINEE_EMAIL_DOMAIN = "tvtc.edu.sa";

/**
 * بريد المتدرب المولّد — دالة حتمية من الرقم التدريبي.
 * تُستدعى في الخادم فقط؛ لا تصل أي قيمة للبريد من واجهة المستخدم.
 */
export function buildTraineeEmail(traineeNumber: string): string {
  return `${traineeNumber.trim()}@${TRAINEE_EMAIL_DOMAIN}`;
}

export const requestTypeEnum = z.enum(["REQUEST", "COMPLAINT", "INQUIRY"]);

/** حقل الرقم التدريبي في مخططات Zod — يعيد استخدام الدالة المشتركة */
const traineeNumberField = z
  .string()
  .trim()
  .refine(isValidTraineeNumber, TRAINEE_NUMBER_ERROR);

/** نموذج تقديم الطلب العام */
export const submitRequestSchema = z.object({
  traineeName: z
    .string()
    .trim()
    .min(3, "الرجاء إدخال اسم المتدرب (3 أحرف على الأقل)")
    .max(120, "الاسم طويل جدًا"),
  traineeNumber: traineeNumberField,
  specialtyId: z.string().trim().min(1, "الرجاء اختيار التخصص"),
  type: requestTypeEnum,
  body: z
    .string()
    .trim()
    .min(10, "نص الطلب قصير جدًا (10 أحرف على الأقل)")
    .max(4000, "نص الطلب طويل جدًا (4000 حرف كحد أقصى)"),
});

/** رسالة جديدة داخل المحادثة */
export const messageSchema = z.object({
  requestId: z.string().trim().min(1),
  body: z
    .string()
    .trim()
    .min(1, "لا يمكن إرسال رسالة فارغة")
    .max(4000, "الرسالة طويلة جدًا (4000 حرف كحد أقصى)"),
});

/** سبب الرفض الذي يكتبه الأدمن */
export const rejectSchema = z.object({
  requestId: z.string().trim().min(1),
  reason: z
    .string()
    .trim()
    .min(3, "الرجاء كتابة سبب الرفض")
    .max(1000, "السبب طويل جدًا"),
});

/** تتبّع الطلبات بالرقم التدريبي */
export const trackSchema = z.object({
  traineeNumber: traineeNumberField,
});

/** إضافة/تعديل تخصص */
export const specialtySchema = z.object({
  name: z.string().trim().min(2, "اسم التخصص قصير جدًا").max(80, "اسم التخصص طويل جدًا"),
  headId: z.string().trim().optional(),
});

/** إضافة مستخدم (رئيس قسم أو وكيل تدريب) */
export const createUserSchema = z.object({
  name: z.string().trim().min(3, "الرجاء إدخال الاسم").max(120, "الاسم طويل جدًا"),
  email: z.string().trim().toLowerCase().email("صيغة البريد غير صحيحة"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل").max(72),
  role: z.enum(["DEPT_HEAD", "DEPUTY", "ADMIN"]),
});

/** تعديل مستخدم — كلمة المرور اختيارية */
export const updateUserSchema = z.object({
  userId: z.string().trim().min(1),
  name: z.string().trim().min(3, "الرجاء إدخال الاسم").max(120),
  email: z.string().trim().toLowerCase().email("صيغة البريد غير صحيحة"),
  password: z
    .union([z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل").max(72), z.literal("")])
    .optional(),
  isActive: z.boolean(),
});

/** نتيجة موحّدة تُعيدها كل الـ Server Actions إلى النماذج */
export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

/** تحويل أخطاء Zod إلى خريطة حقل ← رسالة */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
