/*
  Warnings:

  - You are about to drop the column `userId` on the `kyc_documents` table. All the data in the column will be lost.
  - Added the required column `kycInfoId` to the `kyc_documents` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "kyc_documents" DROP CONSTRAINT "kyc_documents_userId_fkey";

-- AlterTable
ALTER TABLE "kyc_documents" DROP COLUMN "userId",
ADD COLUMN     "kycInfoId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_kycInfoId_fkey" FOREIGN KEY ("kycInfoId") REFERENCES "kyc_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;
