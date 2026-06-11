-- AlterTable
ALTER TABLE "saved_partitions" ADD COLUMN     "lastOpenedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activationChecklistDismissedAt" TIMESTAMP(3),
ADD COLUMN     "fallingNotesTriedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "saved_partitions_userId_lastOpenedAt_idx" ON "saved_partitions"("userId", "lastOpenedAt");
