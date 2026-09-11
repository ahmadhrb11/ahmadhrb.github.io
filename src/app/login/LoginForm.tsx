"use client";

/** نموذج تسجيل الدخول — يستدعي مزوّد Credentials في NextAuth */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
    });

    setPending(false);

    if (!result || result.error) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      return;
    }

    // التوجيه إلى لوحة الدور المناسب (تحدده صفحة /post-login حسب الجلسة)
    router.push(callbackUrl || "/post-login");
    router.refresh();
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="البريد الإلكتروني">
          <Input name="email" type="email" required autoComplete="username" placeholder="admin@example.com" />
        </Field>
        <Field label="كلمة المرور">
          <Input name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />
        </Field>

        {error ? <Alert tone="error">{error}</Alert> : null}

        <Button type="submit" disabled={pending}>
          {pending ? "جارٍ التحقق..." : "تسجيل الدخول"}
        </Button>
      </form>
    </Card>
  );
}
