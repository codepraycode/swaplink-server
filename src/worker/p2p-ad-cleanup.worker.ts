import { Worker, Job } from 'bullmq';
import { redisConnection } from '../shared/config/redis.config';
import { prisma, AdStatus } from '../shared/database';
import logger from '../shared/lib/utils/logger';
import { emailService } from '../shared/lib/services/email-service/email.service';
import { P2P_AD_CLEANUP_QUEUE_NAME } from '../shared/lib/queues/p2p-ad-cleanup.queue';

export const p2pAdCleanupWorker = new Worker(
    P2P_AD_CLEANUP_QUEUE_NAME,
    async (job: Job) => {
        logger.info(`🧹 Processing P2P Ad Cleanup Job: ${job.name}`);

        try {
            // 1. Auto-Pause Ads Active for More Than 24 Hours
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const expiredAds = await prisma.p2PAd.findMany({
                where: {
                    status: AdStatus.ACTIVE,
                    createdAt: {
                        lt: twentyFourHoursAgo,
                    },
                },
                include: {
                    user: true,
                },
            });

            if (expiredAds.length > 0) {
                logger.info(
                    `⏰ Found ${expiredAds.length} ads active for more than 24 hours. Pausing...`
                );

                for (const ad of expiredAds) {
                    // Pause the ad
                    await prisma.p2PAd.update({
                        where: { id: ad.id },
                        data: { status: AdStatus.PAUSED },
                    });

                    // Notify user
                    if (ad.user.email) {
                        try {
                            await emailService.sendTemplatedEmail({
                                to: ad.user.email,
                                subject: 'P2P Ad Auto-Paused After 24 Hours',
                                templateName: 'p2p-ad-paused',
                                data: {
                                    name: ad.user.firstName,
                                    adType: ad.type,
                                    currency: ad.currency,
                                    price: ad.price,
                                    remainingAmount: ad.remainingAmount,
                                    dashboardUrl: `${process.env.FRONTEND_URL}/p2p/my-ads`,
                                },
                            });
                            logger.info(
                                `📩 Sent 24hr pause notification to ${ad.user.email} for Ad ${ad.id}`
                            );
                        } catch (emailError) {
                            logger.error(
                                `❌ Failed to send email to ${ad.user.email}:`,
                                emailError
                            );
                        }
                    }
                }

                logger.info(`✅ Paused ${expiredAds.length} ads that exceeded 24-hour limit.`);
            }

            // 2. Close Ads with 0 Remaining Amount
            const zeroBalanceAds = await prisma.p2PAd.updateMany({
                where: {
                    status: AdStatus.ACTIVE,
                    remainingAmount: 0,
                },
                data: {
                    status: AdStatus.CLOSED,
                },
            });

            if (zeroBalanceAds.count > 0) {
                logger.info(`✅ Closed ${zeroBalanceAds.count} ads with 0 remaining balance.`);
            }

            // 3. Find "Dust" Ads (Remaining > 0 AND Remaining < MinLimit)
            // We fetch all active ads with remaining > 0 and filter in memory
            // Optimization: We could filter by updated recently if we wanted to avoid spam,
            // but for now we process all to ensure compliance.
            const activeAds = await prisma.p2PAd.findMany({
                where: {
                    status: AdStatus.ACTIVE,
                    remainingAmount: {
                        gt: 0,
                    },
                },
                include: {
                    user: true,
                },
            });

            const dustAds = activeAds.filter(ad => ad.remainingAmount < ad.minLimit);

            if (dustAds.length > 0) {
                logger.info(`Found ${dustAds.length} dust ads. Sending notifications...`);

                for (const ad of dustAds) {
                    if (ad.user.email) {
                        try {
                            await emailService.sendTemplatedEmail({
                                to: ad.user.email,
                                subject: 'Action Required: P2P Ad Low Balance',
                                templateName: 'p2p-ad-low-balance',
                                data: {
                                    name: ad.user.firstName,
                                    adType: ad.type,
                                    currency: ad.currency,
                                    price: ad.price,
                                    remainingAmount: ad.remainingAmount,
                                    minLimit: ad.minLimit,
                                    dashboardUrl: `${process.env.FRONTEND_URL}/p2p/my-ads`,
                                },
                            });
                            logger.info(
                                `📩 Sent dust warning email to ${ad.user.email} for Ad ${ad.id}`
                            );
                        } catch (emailError) {
                            logger.error(
                                `❌ Failed to send email to ${ad.user.email}:`,
                                emailError
                            );
                        }
                    }
                }
            }

            logger.info('✅ P2P Ad Cleanup Complete');
        } catch (error) {
            logger.error('❌ P2P Ad Cleanup Failed:', error);
            throw error;
        }
    },
    {
        connection: redisConnection,
        concurrency: 1,
    }
);
