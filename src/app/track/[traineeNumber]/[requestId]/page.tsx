import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { Conversation } from "@/components/Conversation";
import { MessageForm } from "@/components/MessageForm";
import { RequestMeta } from "@/components/RequestMeta";
import { Alert, Card, CardHeader, RefCode } from "@/components/ui";
import { traineeMessageAction } from "@/actions/messages";
import { prisma } from "@/lib/prisma";
import { OPEN_CONVERSATION_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { shortId } from "@/lib/format";

export const dynamic = "force-dynamic";

/** تفاصيل طلب واحد للمتدرب + المحادثة الكاملة + خانة الرد */
export default async function TraineeRequestPage({
  params,
}: {
  params: Promise<{ traineeNumber: string; requestId: string }>;
}) {
  const { traineeNumber: raw, requestId } = await params;
  const traineeNumber = decodeURIComponent(raw);

  // التقييد بالرقم التدريبي يمنع فتح طلب لا يخص صاحب الرقم
  const request = await prisma.request.findFirst({
    where: { id: requestId, traineeNumber },
    include: {
      specialty: true,
      assignedHead: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!request) notFound();

  const canReply = OPEN_CONVERSATION_STATUSES.includes(request.status);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Link
          href={`/track/${encodeURIComponent(traineeNumber)}`}
          className="text-sm font-semibold text-sky-600 hover:underline"
        >
          → العودة إلى قائمة طلباتي
        </Link>

        <h1 className="mt-3 text-2xl font-extrabold text-slate-900">
          تفاصيل الطلب <RefCode id={shortId(request.id)} />
        </h1>

        <div className="mt-6 flex flex-col gap-6">
          <Card>
            <CardHeader title="بيانات الطلب" />
            <RequestMeta request={request} />
          </Card>

          <Card>
            <CardHeader
              title="المحادثة"
              subtitle={
                request.status === "ESCALATED"
                  ? "تم تصعيد طلبك إلى وكيل التدريب، وهو من يتابعه معك الآن."
                  : request.status === "IN_PROGRESS"
                    ? `طلبك لدى رئيس القسم${request.assignedHead ? `: ${request.assignedHead.name}` : ""}`
                    : undefined
              }
            />
            <Conversation messages={request.messages} viewer="TRAINEE" />

            {canReply ? (
              <MessageForm
                action={traineeMessageAction}
                requestId={request.id}
                traineeNumber={traineeNumber}
                placeholder="اكتب ردّك على المسؤول عن طلبك..."
              />
            ) : (
              <div className="border-t border-slate-200 px-5 py-4">
                <Alert tone={request.status === "REJECTED" ? "error" : "info"}>
                  {request.status === "PENDING_REVIEW"
                    ? "طلبك ما زال قيد المراجعة لدى مسؤول النظام. ستفتح المحادثة فور الموافقة عليه."
                    : request.status === "REJECTED"
                      ? "تم رفض هذا الطلب، ولا يمكن إضافة ردود جديدة. راجع سبب الرفض أعلاه."
                      : `حالة الطلب «${STATUS_LABELS[request.status]}» — لا يمكن إضافة ردود جديدة.`}
                </Alert>
              </div>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}
