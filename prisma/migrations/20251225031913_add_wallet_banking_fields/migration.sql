/*
  Warnings:

  - You are about to alter the column `amount` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,2)`.
  - You are about to alter the column `balanceBefore` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,2)`.
  - You are about to alter the column `balanceAfter` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,2)`.
  - You are about to alter the column `fee` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,2)`.
  - You are about to alter the column `cumulativeInflow` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(20,2)`.
  - You are about to alter the column `balance` on the `wallets` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,2)`.
  - You are about to alter the column `lockedBalance` on the `wallets` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,2)`.

*/
-- CreateEnum
CREATE TYPE "UserFlagType" AS ENUM ('NONE', 'KYC_LIMIT', 'SUSPICIOUS', 'FRAUD', 'MANUAL');

-- CreateEnum
CREATE TYPE "WalletFlagType" AS ENUM ('NONE', 'LIEN', 'FROZEN', 'INVESTIGATION');

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(20,2),
ALTER COLUMN "balanceBefore" SET DATA TYPE DECIMAL(20,2),
ALTER COLUMN "balanceAfter" SET DATA TYPE DECIMAL(20,2),
ALTER COLUMN "fee" SET DATA TYPE DECIMAL(20,2);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "flagReason" TEXT,
ADD COLUMN     "flagType" "UserFlagType" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "flaggedAt" TIMESTAMP(3),
ALTER COLUMN "cumulativeInflow" SET DATA TYPE DECIMAL(20,2);

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "flagReason" TEXT,
ADD COLUMN     "flagType" "WalletFlagType" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "flaggedAt" TIMESTAMP(3),
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(20,2),
ALTER COLUMN "lockedBalance" SET DATA TYPE DECIMAL(20,2);
