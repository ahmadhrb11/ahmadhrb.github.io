/** تنسيقات أرقام لوحة المعلومات */

/** نسبة مئوية، أو شرطة إن تعذّر حسابها */
export function pct(value: number | null, digits = 0): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

/** مدة بالساعات تُعرض بالساعات أو بالأيام حسب حجمها */
export function duration(hours: number | null): string {
  if (hours === null || Number.isNaN(hours)) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} دقيقة`;
  if (hours < 48) return `${hours.toFixed(1)} ساعة`;
  return `${(hours / 24).toFixed(1)} يوم`;
}

/** مدة بالأيام */
export function days(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)} يوم`;
}
