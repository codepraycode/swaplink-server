-- DropForeignKey
ALTER TABLE "admin_logs" DROP CONSTRAINT "admin_logs_adminId_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "beneficiaries" DROP CONSTRAINT "beneficiaries_userId_fkey";

-- DropForeignKey
ALTER TABLE "p2p_ads" DROP CONSTRAINT "p2p_ads_userId_fkey";

-- DropForeignKey
ALTER TABLE "p2p_chats" DROP CONSTRAINT "p2p_chats_orderId_fkey";

-- DropForeignKey
ALTER TABLE "p2p_chats" DROP CONSTRAINT "p2p_chats_senderId_fkey";

-- DropForeignKey
ALTER TABLE "p2p_orders" DROP CONSTRAINT "p2p_orders_adId_fkey";

-- DropForeignKey
ALTER TABLE "p2p_orders" DROP CONSTRAINT "p2p_orders_makerId_fkey";

-- DropForeignKey
ALTER TABLE "p2p_orders" DROP CONSTRAINT "p2p_orders_takerId_fkey";

-- DropForeignKey
ALTER TABLE "p2p_payment_methods" DROP CONSTRAINT "p2p_payment_methods_userId_fkey";

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "p2p_payment_methods" ADD CONSTRAINT "p2p_payment_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "p2p_ads" ADD CONSTRAINT "p2p_ads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "p2p_orders" ADD CONSTRAINT "p2p_orders_adId_fkey" FOREIGN KEY ("adId") REFERENCES "p2p_ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "p2p_orders" ADD CONSTRAINT "p2p_orders_makerId_fkey" FOREIGN KEY ("makerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "p2p_orders" ADD CONSTRAINT "p2p_orders_takerId_fkey" FOREIGN KEY ("takerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "p2p_chats" ADD CONSTRAINT "p2p_chats_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "p2p_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "p2p_chats" ADD CONSTRAINT "p2p_chats_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
