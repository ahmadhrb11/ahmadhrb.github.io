/**
 * التسميات العربية والألوان المرتبطة بحالات الطلب وأنواعه وأدوار المستخدمين.
 * مصدر واحد للحقيقة يُستخدم في كل الواجهات.
 */
import type { Role, RequestStatus, RequestType, SenderRole } from "@prisma/client";

export const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING_REVIEW: "قيد المراجعة",
  IN_PROGRESS: "قيد المعالجة",
  ESCALATED: "مُصعّد لوكيل التدريب",
  COMPLETED: "منتهي",
  REJECTED: "مرفوض",
};

/** أصناف Tailwind لشارة كل حالة */
export const STATUS_STYLES: Record<RequestStatus, string> = {
  PENDING_REVIEW: "bg-amber-100 text-amber-800 ring-amber-200",
  IN_PROGRESS: "bg-sky-100 text-sky-800 ring-sky-200",
  ESCALATED: "bg-purple-100 text-purple-800 ring-purple-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  REJECTED: "bg-rose-100 text-rose-800 ring-rose-200",
};

export const TYPE_LABELS: Record<RequestType, string> = {
  REQUEST: "طلب",
  COMPLAINT: "شكوى",
  INQUIRY: "استفسار",
};

export const TYPE_STYLES: Record<RequestType, string> = {
  REQUEST: "bg-slate-100 text-slate-700 ring-slate-200",
  COMPLAINT: "bg-orange-100 text-orange-700 ring-orange-200",
  INQUIRY: "bg-indigo-100 text-indigo-700 ring-indigo-200",
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "مسؤول النظام",
  DEPT_HEAD: "رئيس قسم",
  DEPUTY: "وكيل التدريب",
};

export const SENDER_LABELS: Record<SenderRole, string> = {
  TRAINEE: "المتدرب",
  ADMIN: "مسؤول النظام",
  DEPT_HEAD: "رئيس القسم",
  DEPUTY: "وكيل التدريب",
  SYSTEM: "النظام",
};

/** لوحة التحكم الافتراضية لكل دور بعد تسجيل الدخول */
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  DEPT_HEAD: "/department",
  DEPUTY: "/deputy",
};

/** الحالات التي تسمح بإضافة رسائل جديدة على الطلب */
export const OPEN_CONVERSATION_STATUSES: RequestStatus[] = ["IN_PROGRESS", "ESCALATED"];

/** عدد الأيام قبل التصعيد التلقائي (قابل للضبط عبر متغيّر بيئة) */
export const ESCALATION_DAYS = Number(process.env.ESCALATION_DAYS ?? 3) || 3;
