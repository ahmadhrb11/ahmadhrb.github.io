import Link from "next/link";
import { notFound } from "next/navigation";
import { Conversation } from "@/components/Conversation";
import { MessageForm } from "@/components/MessageForm";
import { RequestMeta } from "@/components/RequestMeta";
import { RequestTimeline } from "@/components/RequestTimeline";
import { Alert, Card, CardHeader, RefCode } from "@/components/ui";
import { staffMessageAction } from "@/actions/messages";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { shortId } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * صفحة الطلب لوكيل التدريب — يرى المحادثة كاملة منذ البداية
 * (شاملة مراسلات رئيس القسم قبل التصعيد) ويكمل المراسلة مع المتدرب.
 */
export default async function DeputyRequestPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("DEPUTY");
  const { id } = await params;

  // الوكيل يصل فقط للطلبات المُصعّدة (أو التي سبق تصعيدها ثم أُنهيت)
  const request = await prisma.request.findFirst({
    where: { id, escalatedAt: { not: null } },
    include: {
      specialty: true,
      assignedHead: true,
      messages: { orderBy: { createdAt: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!request) notFound();

  const canReply = request.status === "ESCALATED";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/deputy" className="text-sm font-semibold text-sky-600 hover:underline">
          → العودة إلى الطلبات المُصعّدة
        </Link>
        <h1 className="mt-2 text-xl font-extrabold text-slate-900">
          الطلب <RefCode id={shortId(request.id)} />
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader title="بيانات الطلب والمتدرب" />
            <RequestMeta request={request} />
          </Card>

          <Card>
            <CardHeader
              title="المحادثة الكاملة"
              subtitle="منذ تقديم الطلب، شاملة مراسلات رئيس القسم قبل التصعيد"
            />
            <Conversation messages={request.messages} viewer="DEPUTY" />

            {canReply ? (
              <MessageForm
                action={staffMessageAction}
                requestId={request.id}
                placeholder="اكتب ردّك للمتدرب..."
              />
            ) : (
              <div className="border-t border-slate-200 px-5 py-4">
                <Alert tone="info">هذا الطلب مغلق ولا يقبل ردودًا جديدة.</Alert>
              </div>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader title="سجل الحالة" subtitle="شامل وقت وسبب التصعيد" />
          <RequestTimeline events={request.events} />
        </Card>
      </div>
    </div>
  );
}
