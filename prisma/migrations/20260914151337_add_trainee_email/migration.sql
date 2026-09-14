-- إضافة حقل بريد المتدرب المولّد.
-- الصفوف القائمة تُعبَّأ بالاشتقاق من الرقم التدريبي نفسه، فلا يبقى صف بلا بريد
-- ويصحّ جعل الحقل إلزاميًا (البريد دالة حتمية من الرقم، فلا فرق بين
-- التعبئة هنا والتوليد وقت الإنشاء).
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Request" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "traineeName" TEXT NOT NULL,
    "traineeNumber" TEXT NOT NULL,
    "traineeEmail" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "assignedHeadId" TEXT,
    "approvedAt" DATETIME,
    "rejectedAt" DATETIME,
    "rejectionReason" TEXT,
    "lastHeadReplyAt" DATETIME,
    "escalatedAt" DATETIME,
    "escalationReason" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Request_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Request_assignedHeadId_fkey" FOREIGN KEY ("assignedHeadId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Request" ("approvedAt", "assignedHeadId", "body", "completedAt", "createdAt", "escalatedAt", "escalationReason", "id", "lastHeadReplyAt", "rejectedAt", "rejectionReason", "specialtyId", "status", "traineeName", "traineeNumber", "traineeEmail", "type", "updatedAt") SELECT "approvedAt", "assignedHeadId", "body", "completedAt", "createdAt", "escalatedAt", "escalationReason", "id", "lastHeadReplyAt", "rejectedAt", "rejectionReason", "specialtyId", "status", "traineeName", "traineeNumber", "traineeNumber" || '@tvtc.edu.sa', "type", "updatedAt" FROM "Request";
DROP TABLE "Request";
ALTER TABLE "new_Request" RENAME TO "Request";
CREATE INDEX "Request_traineeNumber_idx" ON "Request"("traineeNumber");
CREATE INDEX "Request_status_idx" ON "Request"("status");
CREATE INDEX "Request_assignedHeadId_idx" ON "Request"("assignedHeadId");
CREATE INDEX "Request_specialtyId_idx" ON "Request"("specialtyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
