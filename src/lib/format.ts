/** تنسيق التواريخ بالعربية (تقويم ميلادي وأرقام لاتينية لسهولة القراءة) */
const dateTimeFormatter = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatDateTime(value: Date | string): string {
  return dateTimeFormatter.format(new Date(value));
}

export function formatDate(value: Date | string): string {
  return dateFormatter.format(new Date(value));
}

/** صيغة مختصرة مثل "قبل 3 أيام" */
export function timeAgo(value: Date | string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `قبل ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `قبل ${days} يوم`;
}

/** معرّف مختصر يُعرض للمستخدم بدل المعرّف الكامل */
export function shortId(id: string): string {
  return id.slice(-6).toUpperCase();
}
