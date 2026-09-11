/**
 * عميل Prisma المشترك.
 *
 * - محليًا / عند التطوير: ملف SQLite عادي عبر DATABASE_URL.
 * - في الإنتاج على Vercel: قاعدة Turso (libSQL) عبر محوّل Prisma،
 *   ويتم التبديل تلقائيًا بمجرّد وجود TURSO_DATABASE_URL.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;

  if (tursoUrl) {
    // وضع الإنتاج: Turso
    const adapter = new PrismaLibSQL({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter });
  }

  // وضع التطوير: ملف SQLite محلي
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// منع إنشاء اتصالات جديدة مع كل إعادة تحميل ساخنة أثناء التطوير
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
