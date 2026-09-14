/**
 * رموز ألوان المخططات — مجموعة مُتحقَّق منها (فحص نطاق الإضاءة، أرضية التشبّع،
 * فصل عمى الألوان، والتباين مع خلفية البطاقة البيضاء).
 *
 * ترتيب ألوان الحالات هو ترتيب سير العمل نفسه، وقد اختير تحديدًا كي لا
 * يتجاور الأخضر والأحمر (أسوأ زوج في عمى الألوان).
 */
import type { RequestStatus } from "@prisma/client";

/** اللون المفرد لمخططات المقدار (سلسلة واحدة = لون واحد) */
export const SERIES_1 = "#2a78d6";
export const SERIES_GREEN = "#008300";

/** ألوان الحالات — نفس عائلات ألوان الشارات في بقية النظام */
export const STATUS_COLORS: Record<RequestStatus, string> = {
  PENDING_REVIEW: "#eda100",
  REJECTED: "#e34948",
  IN_PROGRESS: "#2a78d6",
  ESCALATED: "#4a3aa7",
  COMPLETED: "#008300",
};

/** حبر ومحاور — كلها تراجعية بدرجة واحدة عن السطح */
export const INK = {
  primary: "#0f172a",
  secondary: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  surface: "#ffffff",
};

/** فجوة السطح بين المساحات المتلاصقة (بكسل) */
export const SURFACE_GAP = 2;

/**
 * يختار لون النص داخل مساحة ملوّنة حسب إضاءتها، فلا يُكتب أبيض فوق
 * لون فاتح (الأصفر مثلًا) ولا حبر داكن فوق لون داكن.
 */
export function inkOn(background: string): string {
  const hex = background.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  // نسبة التباين مقابل الأبيض؛ إن قلّت عن 4.5 نستخدم الحبر الداكن
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  return contrastWithWhite >= 4.5 ? INK.surface : INK.primary;
}
