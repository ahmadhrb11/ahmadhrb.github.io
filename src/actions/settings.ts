"use server";

/**
 * إجراءات صفحة الإعدادات (للأدمن فقط):
 * إدارة التخصصات وربطها برؤساء الأقسام، وإدارة حسابات الموظفين.
 */
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import {
  createUserSchema,
  specialtySchema,
  updateUserSchema,
  zodFieldErrors,
  type ActionState,
} from "@/lib/validation";

/** إضافة تخصص جديد (مع إمكانية ربطه برئيس قسم مباشرة) */
export async function createSpecialtyAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("ADMIN");

  const parsed = specialtySchema.safeParse({
    name: formData.get("name"),
    headId: formData.get("headId") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: "تحقق من البيانات", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const exists = await prisma.specialty.findUnique({ where: { name: parsed.data.name } });
  if (exists) return { ok: false, message: "هذا التخصص موجود مسبقًا" };

  await prisma.specialty.create({
    data: {
      name: parsed.data.name,
      headId: parsed.data.headId || null,
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/submit");
  return { ok: true, message: "تمت إضافة التخصص" };
}

/** تعديل اسم التخصص / رئيس القسم المرتبط به / حالة تفعيله */
export async function updateSpecialtyAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("ADMIN");

  const specialtyId = String(formData.get("specialtyId") ?? "");
  const parsed = specialtySchema.safeParse({
    name: formData.get("name"),
    headId: formData.get("headId") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: "تحقق من البيانات", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const specialty = await prisma.specialty.findUnique({ where: { id: specialtyId } });
  if (!specialty) return { ok: false, message: "التخصص غير موجود" };

  const duplicate = await prisma.specialty.findFirst({
    where: { name: parsed.data.name, id: { not: specialtyId } },
  });
  if (duplicate) return { ok: false, message: "يوجد تخصص آخر بنفس الاسم" };

  await prisma.specialty.update({
    where: { id: specialtyId },
    data: {
      name: parsed.data.name,
      headId: parsed.data.headId || null,
      isActive: formData.get("isActive") === "on",
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/submit");
  return { ok: true, message: "تم تحديث التخصص" };
}

/** حذف تخصص — مسموح فقط إن لم تكن عليه طلبات (وإلا يُنصح بتعطيله) */
export async function deleteSpecialtyAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("ADMIN");
  const specialtyId = String(formData.get("specialtyId") ?? "");

  const count = await prisma.request.count({ where: { specialtyId } });
  if (count > 0) {
    return {
      ok: false,
      message: `لا يمكن حذف التخصص لوجود ${count} طلب مرتبط به. يمكنك تعطيله بدل حذفه.`,
    };
  }

  await prisma.specialty.delete({ where: { id: specialtyId } });
  revalidatePath("/admin/settings");
  revalidatePath("/submit");
  return { ok: true, message: "تم حذف التخصص" };
}

/** إضافة حساب موظف (رئيس قسم / وكيل تدريب / أدمن) */
export async function createUserAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("ADMIN");

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, message: "تحقق من البيانات", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return { ok: false, message: "هذا البريد مستخدم مسبقًا" };

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
    },
  });

  revalidatePath("/admin/settings");
  return { ok: true, message: "تمت إضافة الحساب" };
}

/** تعديل حساب موظف (الاسم/البريد/التفعيل، وكلمة المرور اختياريًا) */
export async function updateUserAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("ADMIN");

  const parsed = updateUserSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password") ?? "",
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) {
    return { ok: false, message: "تحقق من البيانات", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const { userId, name, email, password, isActive } = parsed.data;

  const duplicate = await prisma.user.findFirst({ where: { email, id: { not: userId } } });
  if (duplicate) return { ok: false, message: "هذا البريد مستخدم من حساب آخر" };

  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      email,
      isActive,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
  });

  revalidatePath("/admin/settings");
  return { ok: true, message: "تم تحديث الحساب" };
}
