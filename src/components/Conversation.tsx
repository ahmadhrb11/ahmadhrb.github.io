/**
 * عرض المحادثة كاملة بترتيب زمني.
 * `viewer` يحدّد الجهة التي تُعرض رسائلها على أنها "أنت" لتلوينها بشكل مختلف.
 */
import type { Message, SenderRole } from "@prisma/client";
import { SENDER_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

const BUBBLE_STYLES: Record<SenderRole, string> = {
  TRAINEE: "bg-slate-100 text-slate-800 border-slate-200",
  ADMIN: "bg-amber-50 text-amber-900 border-amber-200",
  DEPT_HEAD: "bg-sky-50 text-sky-900 border-sky-200",
  DEPUTY: "bg-purple-50 text-purple-900 border-purple-200",
  SYSTEM: "bg-slate-50 text-slate-600 border-dashed border-slate-300",
};

export function Conversation({
  messages,
  viewer,
}: {
  messages: Message[];
  viewer: SenderRole;
}) {
  if (messages.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-slate-500">لا توجد رسائل بعد.</p>;
  }

  return (
    <ol className="flex flex-col gap-3 px-5 py-5">
      {messages.map((message) => {
        const isViewer = message.senderRole === viewer && viewer !== "SYSTEM";
        const isSystem = message.senderRole === "SYSTEM";
        return (
          <li
            key={message.id}
            className={`flex ${isSystem ? "justify-center" : isViewer ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl border px-4 py-3 ${BUBBLE_STYLES[message.senderRole]} ${
                isSystem ? "max-w-full text-center" : ""
              }`}
            >
              <div className="mb-1 flex flex-wrap items-baseline gap-x-2 text-xs">
                <span className="font-bold">
                  {message.senderName}
                  {!isSystem ? ` · ${SENDER_LABELS[message.senderRole]}` : ""}
                </span>
                <span className="text-slate-400">{formatDateTime(message.createdAt)}</span>
              </div>
              <p className="preserve-lines text-sm leading-6">{message.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
