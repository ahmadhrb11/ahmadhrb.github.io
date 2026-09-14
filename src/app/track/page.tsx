import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { Card } from "@/components/ui";
import { TrackForm } from "@/app/track/TrackForm";
import { TRAINEE_NUMBER_ERROR, trackSchema } from "@/lib/validation";

export const metadata = { title: "تتبّع الطلبات | نظام متابعة طلبات المتدربين" };

/**
 * إدخال الرقم التدريبي فقط — بدون رقم مرجعي وبدون تسجيل دخول.
 * التحقق يُعاد هنا في الخادم ولا يعتمد على تحقق العميل إطلاقًا.
 */
async function goToTrainee(formData: FormData) {
  "use server";
  const parsed = trackSchema.safeParse({ traineeNumber: formData.get("traineeNumber") });
  if (!parsed.success) redirect("/track?error=format");
  redirect(`/track/${encodeURIComponent(parsed.data.traineeNumber)}`);
}

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-14">
        <h1 className="text-center text-2xl font-extrabold text-slate-900">تتبّع طلباتي</h1>
        <p className="mt-2 text-center text-sm leading-7 text-slate-600">
          أدخل رقمك التدريبي لعرض جميع طلباتك وحالاتها.
        </p>

        <Card className="mt-8 p-6">
          <TrackForm action={goToTrainee} serverError={error ? TRAINEE_NUMBER_ERROR : undefined} />
        </Card>
      </main>
    </>
  );
}
