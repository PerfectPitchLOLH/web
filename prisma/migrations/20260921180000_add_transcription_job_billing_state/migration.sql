-- AlterTable
ALTER TABLE "transcription_jobs" ADD COLUMN     "chargedBonusSeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "chargedMonthlySeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ALTER COLUMN "backendJobId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "transcription_jobs_userId_status_idx" ON "transcription_jobs"("userId", "status");

-- CreateIndex
CREATE INDEX "transcription_jobs_status_createdAt_idx" ON "transcription_jobs"("status", "createdAt");

-- Jobs already billed or older than the backend timeout must not occupy an active slot
UPDATE "transcription_jobs"
SET "status" = 'completed'
WHERE "creditsDeducted" = true OR "createdAt" < NOW() - INTERVAL '2 hours';

-- Google vouches for the address: accounts created through OAuth before this change stay verified
UPDATE "users"
SET "emailVerified" = NOW()
WHERE "emailVerified" IS NULL
  AND "id" IN (SELECT "userId" FROM "accounts" WHERE "provider" = 'google');
