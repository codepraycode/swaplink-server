-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'EMAIL', 'INAPP');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'KYC';
ALTER TYPE "NotificationType" ADD VALUE 'SECURITY';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "channel" "NotificationChannel" NOT NULL DEFAULT 'INAPP';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cumulativeInflow" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "deviceId" TEXT;

-- CreateTable
CREATE TABLE "kyc_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerRef" TEXT,
    "rawResponse" JSONB,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_attempts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "kyc_attempts" ADD CONSTRAINT "kyc_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
