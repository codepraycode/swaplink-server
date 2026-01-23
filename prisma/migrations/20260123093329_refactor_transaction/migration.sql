/*
  Warnings:

  - You are about to drop the column `counterpartyId` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `destinationAccount` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `destinationBankCode` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `destinationName` on the `transactions` table. All the data in the column will be lost.
  - Added the required column `receiverAccount` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receiverBankName` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receiverName` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderAccount` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderBankName` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderName` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_counterpartyId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_userId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_walletId_fkey";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "counterpartyId",
DROP COLUMN "destinationAccount",
DROP COLUMN "destinationBankCode",
DROP COLUMN "destinationName",
ADD COLUMN     "receiverAccount" TEXT NOT NULL,
ADD COLUMN     "receiverAvatarUrl" TEXT,
ADD COLUMN     "receiverBankCode" TEXT,
ADD COLUMN     "receiverBankName" TEXT NOT NULL,
ADD COLUMN     "receiverName" TEXT NOT NULL,
ADD COLUMN     "senderAccount" TEXT NOT NULL,
ADD COLUMN     "senderAvatarUrl" TEXT,
ADD COLUMN     "senderBankCode" TEXT,
ADD COLUMN     "senderBankName" TEXT NOT NULL,
ADD COLUMN     "senderName" TEXT NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "walletId" DROP NOT NULL;
