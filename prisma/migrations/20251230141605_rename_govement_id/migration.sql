/*
  Warnings:

  - You are about to drop the column `bvn` on the `kyc_info` table. All the data in the column will be lost.
  - You are about to drop the column `nin` on the `kyc_info` table. All the data in the column will be lost.
  - You are about to drop the `kyc_attempts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "kyc_attempts" DROP CONSTRAINT "kyc_attempts_userId_fkey";

-- AlterTable
ALTER TABLE "kyc_documents" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "kyc_info" DROP COLUMN "bvn",
DROP COLUMN "nin",
ADD COLUMN     "governmentId" TEXT;

-- DropTable
DROP TABLE "kyc_attempts";
