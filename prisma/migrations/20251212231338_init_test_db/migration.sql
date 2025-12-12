/*
  Warnings:

  - The values [TRADE,CONVERSION] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `currency` on the `bank_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `otps` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the `escrow` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `offers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `trades` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `wallets` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "OtpType" ADD VALUE 'WITHDRAWAL_CONFIRMATION';

-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'BILL_PAYMENT', 'FEE', 'REVERSAL');
ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "TransactionType_new" USING ("type"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "public"."TransactionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."bank_accounts" DROP CONSTRAINT "bank_accounts_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."escrow" DROP CONSTRAINT "escrow_fromUserId_fkey";

-- DropForeignKey
ALTER TABLE "public"."escrow" DROP CONSTRAINT "escrow_toUserId_fkey";

-- DropForeignKey
ALTER TABLE "public"."escrow" DROP CONSTRAINT "escrow_tradeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."kyc_documents" DROP CONSTRAINT "kyc_documents_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."offers" DROP CONSTRAINT "offers_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."trades" DROP CONSTRAINT "trades_buyerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."trades" DROP CONSTRAINT "trades_offerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."trades" DROP CONSTRAINT "trades_sellerId_fkey";

-- DropIndex
DROP INDEX "public"."wallets_userId_currency_key";

-- AlterTable
ALTER TABLE "bank_accounts" DROP COLUMN "currency";

-- AlterTable
ALTER TABLE "otps" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "currency",
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "wallets" DROP COLUMN "currency";

-- DropTable
DROP TABLE "public"."escrow";

-- DropTable
DROP TABLE "public"."offers";

-- DropTable
DROP TABLE "public"."trades";

-- DropEnum
DROP TYPE "public"."Currency";

-- DropEnum
DROP TYPE "public"."EscrowStatus";

-- DropEnum
DROP TYPE "public"."OfferStatus";

-- DropEnum
DROP TYPE "public"."OfferType";

-- DropEnum
DROP TYPE "public"."TradeStatus";

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
