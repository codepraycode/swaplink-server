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
            // 1. Close Ads with 0 Remaining Amount
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

            // 2. Find "Dust" Ads (Remaining > 0 AND Remaining < MinLimit)
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
                            await emailService.sendEmail({
                                to: ad.user.email,
                                subject: 'Action Required: P2P Ad Low Balance',
                                html: `
                                    <p>Hello ${ad.user.firstName},</p>
                                    <p>Your P2P Ad for <b>${ad.currency}</b> has a remaining balance of <b>${ad.remainingAmount}</b>, which is below your minimum limit of <b>${ad.minLimit}</b>.</p>
                                    <p>This means no new orders can be placed on this ad.</p>
                                    <p>Please either:</p>
                                    <ul>
                                        <li>Reduce your minimum limit to match the remaining amount.</li>
                                        <li>Cancel/Close the ad.</li>
                                    </ul>
                                    <p>Thank you,<br/>SwapLink Team</p>
                                `,
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
