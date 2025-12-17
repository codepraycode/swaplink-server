/*
  Warnings:

  - You are about to drop the column `senderId` on the `transactions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_senderId_fkey";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "senderId",
ADD COLUMN     "counterpartyId" TEXT;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
