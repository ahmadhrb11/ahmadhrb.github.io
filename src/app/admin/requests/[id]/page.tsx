import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminRequestActions } from "@/components/AdminRequestActions";
import { Conversation } from "@/components/Conversation";
import { MessageForm } from "@/components/MessageForm";
import { RequestMeta } from "@/components/RequestMeta";
import { RequestTimeline } from "@/components/RequestTimeline";
import { Card, CardHeader, RefCode } from "@/components/ui";
import { staffMessageAction } from "@/actions/messages";
import { prisma } from "@/lib/prisma";
import { OPEN_CONVERSATION_STATUSES } from "@/lib/constants";
import { shortId } from "@/lib/format";

export const dynamic = "force-dynamic";

/** شاشة تفاصيل الطلب للأدمن: البيانات + الإجراءات + السجل + المحادثة الكاملة */
export default async function AdminRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      specialty: { include: { head: true } },
      assignedHead: true,
      messages: { orderBy: { createdAt: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!request) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin" className="text-sm font-semibold text-sky-600 hover:underline">
          → العودة إلى كل الطلبات
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
              subtitle="كل الرسائل من المتدرب ورئيس القسم ووكيل التدريب والنظام، بترتيب زمني"
            />
            <Conversation messages={request.messages} viewer="ADMIN" />
            {OPEN_CONVERSATION_STATUSES.includes(request.status) ? (
              <MessageForm
                action={staffMessageAction}
                requestId={request.id}
                placeholder="رسالة من مسؤول النظام (اختياري)..."
                submitLabel="إرسال رسالة"
              />
            ) : null}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="الإجراءات" />
            <AdminRequestActions
              requestId={request.id}
              status={request.status}
              headName={request.specialty.head?.name}
            />
          </Card>

          <Card>
            <CardHeader title="سجل الحالة" subtitle="متى ولماذا تغيّرت حالة الطلب" />
            <RequestTimeline events={request.events} />
          </Card>
        </div>
      </div>
    </div>
  );
}
