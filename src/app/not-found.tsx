import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-extrabold text-slate-300">404</p>
      <h1 className="mt-3 text-xl font-extrabold text-slate-900">الصفحة أو الطلب غير موجود</h1>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        تأكد من صحة الرابط، أو أنك تملك صلاحية الوصول إلى هذا الطلب.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
      >
        العودة إلى الصفحة الرئيسية
      </Link>
    </div>
  );
}
