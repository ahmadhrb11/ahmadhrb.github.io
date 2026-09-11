/**
 * مسار المهمة المجدولة للتصعيد التلقائي.
 *
 * - على Vercel: يُستدعى يوميًا حسب الجدولة في vercel.json.
 * - يدويًا:  curl -H "Authorization: Bearer $CRON_SECRET" https://.../api/cron/escalate
 *
 * الحماية: يجب أن يحمل الطلب CRON_SECRET (أو أن يأتي من Vercel Cron).
 * إن لم يُضبط CRON_SECRET أصلًا فالمسار مفتوح — مناسب للتطوير المحلي فقط.
 */
import { NextResponse } from "next/server";
import { runEscalation } from "@/lib/escalation";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // التطوير المحلي

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  // Vercel Cron يرسل هذه الترويسة تلقائيًا مع نفس السر
  return request.headers.get("x-vercel-cron-signature") !== null && header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }

  try {
    const result = await runEscalation();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("فشل تنفيذ التصعيد التلقائي:", error);
    return NextResponse.json({ ok: false, error: "خطأ أثناء تنفيذ التصعيد" }, { status: 500 });
  }
}
