-- CreateEnum
CREATE TYPE "CreditType" AS ENUM ('MONTHLY', 'BONUS');

-- AlterTable: Rename columns in user_credits to preserve data
ALTER TABLE "user_credits" RENAME COLUMN "subscriptionMinutes" TO "monthlyCredits";
ALTER TABLE "user_credits" RENAME COLUMN "purchasedMinutes" TO "bonusCredits";

-- AlterTable: Replace resetDate with lastMonthlyRefill
ALTER TABLE "user_credits" RENAME COLUMN "resetDate" TO "lastMonthlyRefill";
ALTER TABLE "user_credits" ALTER COLUMN "lastMonthlyRefill" DROP NOT NULL;

-- AlterTable: Set default value for monthlyCredits (180 seconds = 3 minutes)
ALTER TABLE "user_credits" ALTER COLUMN "monthlyCredits" SET DEFAULT 180;
ALTER TABLE "user_credits" ALTER COLUMN "bonusCredits" SET DEFAULT 0;

-- CreateTable: New CreditRefill table for idempotence
CREATE TABLE "credit_refills" (
    "id" TEXT NOT NULL,
    "userCreditsId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "CreditType" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_refills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_refills_stripeInvoiceId_key" ON "credit_refills"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "credit_refills_userCreditsId_idx" ON "credit_refills"("userCreditsId");

-- CreateIndex
CREATE INDEX "credit_refills_stripeInvoiceId_idx" ON "credit_refills"("stripeInvoiceId");

-- AddForeignKey
ALTER TABLE "credit_refills" ADD CONSTRAINT "credit_refills_userCreditsId_fkey" FOREIGN KEY ("userCreditsId") REFERENCES "user_credits"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
