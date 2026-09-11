import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // حزم تعمل على الخادم فقط ويجب ألا تُجمَّع ضمن حزمة المتصفح
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-libsql", "@libsql/client", "bcryptjs"],
};

export default nextConfig;
