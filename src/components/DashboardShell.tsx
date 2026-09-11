/** الهيكل المشترك للوحات التحكم: ترويسة بالاسم والدور + روابط + زر خروج */
import Link from "next/link";
import type { ReactNode } from "react";
import type { Role } from "@prisma/client";
import { ROLE_LABELS } from "@/lib/constants";
import { SignOutButton } from "@/components/SignOutButton";

export function DashboardShell({
  user,
  links,
  children,
}: {
  user: { name: string; role: Role };
  links: { href: string; label: string }[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" className="text-base font-extrabold text-slate-900">
              نظام متابعة طلبات المتدربين
            </Link>
            <nav className="flex items-center gap-1 text-sm font-semibold">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-left">
              <p className="text-sm font-bold text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
