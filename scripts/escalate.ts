/**
 * تشغيل التصعيد التلقائي محليًا بدون الحاجة لاستدعاء HTTP:
 *   npm run escalate
 */
import { runEscalation } from "../src/lib/escalation";

runEscalation()
  .then((result) => {
    console.log("نتيجة التصعيد:", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("فشل التصعيد:", error);
    process.exit(1);
  });
