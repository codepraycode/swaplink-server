/*
  Warnings:

  - The values [PENDING,PAID,CANCELLED] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `p2p_chats` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('IN_PROGRESS', 'PROCESSING', 'COMPLETED', 'DISPUTE');
ALTER TABLE "p2p_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "p2p_orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "p2p_orders" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';
COMMIT;

-- DropForeignKey
ALTER TABLE "p2p_chats" DROP CONSTRAINT "p2p_chats_orderId_fkey";

-- DropForeignKey
ALTER TABLE "p2p_chats" DROP CONSTRAINT "p2p_chats_senderId_fkey";

-- AlterTable
ALTER TABLE "p2p_ads" ADD COLUMN     "engagedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "p2p_orders" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS',
ALTER COLUMN "expiresAt" DROP NOT NULL;

-- DropTable
DROP TABLE "p2p_chats";

-- DropEnum
DROP TYPE "ChatType";
