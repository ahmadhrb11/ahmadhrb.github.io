import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { Button, Card, Field, Input } from "@/components/ui";

export const metadata = { title: "تتبّع الطلبات | نظام متابعة طلبات المتدربين" };

/** إدخال الرقم التدريبي فقط — بدون رقم مرجعي وبدون تسجيل دخول */
async function goToTrainee(formData: FormData) {
  "use server";
  const traineeNumber = String(formData.get("traineeNumber") ?? "").trim();
  if (!traineeNumber) redirect("/track?error=1");
  redirect(`/track/${encodeURIComponent(traineeNumber)}`);
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
          <form action={goToTrainee} className="flex flex-col gap-4">
            <Field
              label="الرقم التدريبي"
              error={error ? "الرجاء إدخال الرقم التدريبي" : undefined}
            >
              <Input name="traineeNumber" required placeholder="مثال: 4412345" autoFocus />
            </Field>
            <Button type="submit">عرض طلباتي</Button>
          </form>
        </Card>
      </main>
    </>
  );
}
