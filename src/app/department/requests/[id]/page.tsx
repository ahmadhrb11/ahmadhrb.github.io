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
 * صفحة الطلب لرئيس القسم.
 * الرد متاح فقط إذا كان الطلب ما زال «قيد المعالجة»؛ بعد التصعيد تبقى الصفحة للاطلاع فقط.
 */
export default async function DepartmentRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("DEPT_HEAD");
  const { id } = await params;

  // التقييد بـ assignedHeadId يمنع رئيس قسم من فتح طلب قسم آخر
  const request = await prisma.request.findFirst({
    where: { id, assignedHeadId: user.id },
    include: {
      specialty: true,
      assignedHead: true,
      messages: { orderBy: { createdAt: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!request) notFound();

  const canReply = request.status === "IN_PROGRESS";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/department" className="text-sm font-semibold text-sky-600 hover:underline">
          → العودة إلى طلباتي
        </Link>
        <h1 className="mt-2 text-xl font-extrabold text-slate-900">
          الطلب <RefCode id={shortId(request.id)} />
        </h1>
      </div>

      {request.status === "ESCALATED" ? (
        <Alert tone="warning">
          تم تصعيد هذا الطلب إلى وكيل التدريب
          {request.escalationReason ? ` (${request.escalationReason})` : ""}. يمكنك الاطلاع على المحادثة
          كاملة، لكن لم يعد بإمكانك إضافة ردود.
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader title="بيانات الطلب والمتدرب" />
            <RequestMeta request={request} />
          </Card>

          <Card>
            <CardHeader title="المحادثة" subtitle="كل الرسائل بترتيب زمني" />
            <Conversation messages={request.messages} viewer="DEPT_HEAD" />

            {canReply ? (
              <MessageForm
                action={staffMessageAction}
                requestId={request.id}
                placeholder="اكتب ردّك للمتدرب..."
              />
            ) : (
              <div className="border-t border-slate-200 px-5 py-4">
                <Alert tone="info">
                  {request.status === "ESCALATED"
                    ? "الطلب مُصعّد لوكيل التدريب — للاطلاع فقط."
                    : "هذا الطلب مغلق ولا يقبل ردودًا جديدة."}
                </Alert>
              </div>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader title="سجل الحالة" />
          <RequestTimeline events={request.events} />
        </Card>
      </div>
    </div>
  );
}
