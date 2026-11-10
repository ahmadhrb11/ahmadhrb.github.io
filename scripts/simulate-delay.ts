/**
 * أداة تطوير: محاكاة انقضاء مهلة دون انتظار أيام فعلية.
 *
 * الساعة في النظام هي طابع **آخر رسالة** في المحادثة (انظر src/lib/escalation.ts)،
 * فالسكربت يُرجِع تلك الرسالة إلى الماضي. أي طرف كان صاحبها يحدّد ما سيحدث:
 *   - آخر رسالة من المتدرب  ⇐ الدور على رئيس القسم ⇐ تصعيد
 *   - آخر رسالة من المسؤول ⇐ الدور على المتدرب   ⇐ إغلاق تلقائي
 *
 * الاستخدام:
 *   npm run simulate:delay -- <requestId> [عدد الأيام]
 *   npm run simulate:delay -- --all [عدد الأيام]
 *
 * ثم:  npm run escalate
 */
import { prisma } from "../src/lib/prisma";

/**
 * يُرجِع إلى الماضي الرسالة التي **تحدّد الساعة**، لا آخر رسالة حرفيًا:
 * رسائل الأدمن والنظام محايدة، ورسالة نظام التحويل هي عادةً آخر رسالة بعد
 * الموافقة مباشرةً. يحدّد السكربت صاحب الدور بنفس قاعدة محرّك المهل ثم
 * يُرجع المرساة الصحيحة.
 */
async function ageRequest(requestId: string, pastDate: Date): Promise<"staff" | "trainee" | null> {
  const [lastStaff, lastTrainee] = await Promise.all([
    prisma.message.findFirst({
      where: { requestId, senderRole: { in: ["DEPT_HEAD", "DEPUTY"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    }),
    prisma.message.findFirst({
      where: { requestId, senderRole: "TRAINEE" },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    }),
  ]);

  if (!lastStaff && !lastTrainee) return null;

  const staffHasLastWord =
    lastStaff !== null && (lastTrainee === null || lastStaff.createdAt > lastTrainee.createdAt);

  if (staffHasLastWord) {
    // الدور على المتدرب ⇐ الساعة من آخر رسالة للمسؤول
    await prisma.message.update({ where: { id: lastStaff!.id }, data: { createdAt: pastDate } });
    return "trainee";
  }

  // الدور على المسؤول ⇐ الساعة من الأحدث بين آخر رسالة للمتدرب وتاريخ الموافقة،
  // فيجب إرجاعهما معًا وإلا بقيت الساعة حديثة.
  if (lastTrainee) {
    await prisma.message.update({ where: { id: lastTrainee.id }, data: { createdAt: pastDate } });
  }
  await prisma.request.updateMany({
    where: { id: requestId, approvedAt: { gt: pastDate } },
    data: { approvedAt: pastDate },
  });
  return "staff";
}

async function main() {
  const [target, daysArg] = process.argv.slice(2);
  const days = Number(daysArg ?? 4);

  if (!target) {
    console.error("الاستخدام: npm run simulate:delay -- <requestId|--all> [عدد الأيام]");
    process.exit(1);
  }

  const pastDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const expected = (turn: "staff" | "trainee" | null) =>
    turn === "staff" ? "تصعيد" : turn === "trainee" ? "إغلاق تلقائي" : "لا شيء (لا رسائل)";

  if (target === "--all") {
    const open = await prisma.request.findMany({
      where: { status: { in: ["IN_PROGRESS", "ESCALATED"] } },
      select: { id: true, traineeNumber: true },
    });
    for (const request of open) {
      const turn = await ageRequest(request.id, pastDate);
      console.log(`  ${request.traineeNumber}: الدور على ${turn === "staff" ? "المسؤول" : turn === "trainee" ? "المتدرب" : "—"} ⇐ المتوقع: ${expected(turn)}`);
    }
    console.log(`\nتم إرجاع ${open.length} طلبًا مفتوحًا إلى ${days} أيام مضت.`);
  } else {
    const turn = await ageRequest(target, pastDate);
    if (turn === null) {
      console.error(`لا توجد رسائل في الطلب ${target}.`);
      process.exit(1);
    }
    console.log(`تم إرجاع الطلب ${target} إلى ${days} أيام مضت.`);
    console.log(`الدور على ${turn === "staff" ? "المسؤول" : "المتدرب"} ⇐ المتوقع: ${expected(turn)}`);
  }

  console.log("شغّل الآن: npm run escalate");
}

main()
  .catch((error) => {
    console.error("فشل:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
