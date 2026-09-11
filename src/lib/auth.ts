/**
 * إعداد NextAuth v5 — مصادقة بالبريد وكلمة المرور فقط (تحقق محلي، بدون بريد فعلي).
 * الجلسة تُخزَّن في JWT حتى لا نحتاج جدول جلسات في قاعدة البيانات.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // مطلوب عند الاستضافة الذاتية أو خلف وسيط (Vercel يضبطه تلقائيًا).
  // بدونه يرفض NextAuth أي طلب في وضع الإنتاج بخطأ UntrustedHost.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "البريد الإلكتروني", type: "email" },
        password: { label: "كلمة المرور", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    // نضع المعرّف والدور داخل التوكن ليكونا متاحين في كل مكان بلا استعلام إضافي
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id as string;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});
