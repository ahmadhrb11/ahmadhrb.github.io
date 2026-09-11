/**
 * أداة تطوير: محاكاة تأخّر رئيس القسم لاختبار التصعيد التلقائي دون انتظار 3 أيام فعلية.
 * تُرجِع حقل lastHeadReplyAt لطلب محدد (أو لكل الطلبات «قيد المعالجة») إلى الماضي.
 *
 * الاستخدام:
 *   npm run simulate:delay -- <requestId> [عدد الأيام]
 *   npm run simulate:delay -- --all [عدد الأيام]
 *
 * ثم:  npm run escalate
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const [target, daysArg] = process.argv.slice(2);
  const days = Number(daysArg ?? 4);

  if (!target) {
    console.error("الاستخدام: npm run simulate:delay -- <requestId|--all> [عدد الأيام]");
    process.exit(1);
  }

  const pastDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  if (target === "--all") {
    const result = await prisma.request.updateMany({
      where: { status: "IN_PROGRESS" },
      data: { lastHeadReplyAt: pastDate },
    });
    console.log(`تم إرجاع ${result.count} طلب «قيد المعالجة» إلى ${days} أيام مضت.`);
  } else {
    await prisma.request.update({
      where: { id: target },
      data: { lastHeadReplyAt: pastDate },
    });
    console.log(`تم إرجاع الطلب ${target} إلى ${days} أيام مضت.`);
  }

  console.log("شغّل الآن: npm run escalate");
}

main()
  .catch((error) => {
    console.error("فشل:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
