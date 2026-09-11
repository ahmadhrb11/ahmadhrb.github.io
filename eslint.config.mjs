// إعداد ESLint بصيغة Flat Config (Next.js 16)
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "node_modules/**", "prisma/migrations/**"],
  },
];

export default eslintConfig;
