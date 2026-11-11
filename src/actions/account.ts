"use server";

/**
 * إجراءات حساب الموظف نفسه — متاحة لرئيس القسم ووكيل التدريب.
 * مقصورة على الحساب المسجَّل دخوله: لا تستقبل معرّف مستخدم من النموذج إطلاقًا.
 * (إدارة حسابات الآخرين تبقى في src/actions/settings.ts للأدمن وحده.)
 */
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAnyRole } from "@/lib/guards";
import { changePasswordSchema, zodFieldErrors, type ActionState } from "@/lib/validation";

/** تغيير كلمة مرور الحساب الحالي بعد التحقق من كلمة المرور القائمة */
export async function changeOwnPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  // الهوية من الجلسة حصرًا — أي قيمة في النموذج لا تؤثر على الحساب المستهدف
  const sessionUser = await requireAnyRole(["DEPT_HEAD", "DEPUTY"]);

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, message: "تحقق من الحقول", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { passwordHash: true, isActive: true },
  });
  if (!user || !user.isActive) {
    return { ok: false, message: "الحساب غير متاح. راجع مسؤول النظام." };
  }

  const currentMatches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!currentMatches) {
    return {
      ok: false,
      message: "كلمة المرور الحالية غير صحيحة",
      fieldErrors: { currentPassword: "كلمة المرور الحالية غير صحيحة" },
    };
  }

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });

  return {
    ok: true,
    message: "تم تغيير كلمة المرور. استخدمها في تسجيل الدخول القادم.",
  };
}
