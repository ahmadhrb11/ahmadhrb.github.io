import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "نظام متابعة طلبات المتدربين",
  description: "منصّة لتقديم طلبات وشكاوى واستفسارات المتدربين ومتابعتها حتى الإغلاق",
};

/** التخطيط الجذري — الواجهة عربية بالكامل واتجاه الصفحة من اليمين لليسار */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
