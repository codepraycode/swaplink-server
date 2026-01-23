import { prisma } from '../shared/database';
import logger from '../shared/lib/utils/logger';

/**
 * Migration Script: Flatten Transaction Table
 *
 * This script migrates existing transaction records to the new decoupled structure.
 * It resolves all user/wallet/counterparty references and populates the detached
 * sender/receiver fields.
 */

async function flattenTransactions() {
    logger.info('🚀 Starting transaction table flattening migration...');

    try {
        // Fetch all transactions with their relations
        const transactions = await prisma.$queryRaw<any[]>`
            SELECT 
                t.id,
                t."userId",
                t."walletId",
                t.type,
                t.amount,
                t."counterpartyId",
                t.metadata,
                t.description,
                
                -- User details (owner of transaction)
                u."firstName" as user_first_name,
                u."lastName" as user_last_name,
                u.email as user_email,
                u."avatarUrl" as user_avatar,
                
                -- User's virtual account
                va."accountNumber" as user_account,
                va."bankName" as user_bank_name,
                va."accountName" as user_account_name,
                
                -- Counterparty details
                cp."firstName" as cp_first_name,
                cp."lastName" as cp_last_name,
                cp.email as cp_email,
                cp."avatarUrl" as cp_avatar,
                
                -- Counterparty's virtual account
                cpva."accountNumber" as cp_account,
                cpva."bankName" as cp_bank_name,
                cpva."accountName" as cp_account_name,
                
                -- Existing destination fields (for external transfers)
                t."destinationName",
                t."destinationAccount",
                t."destinationBankCode",
                t."destinationBankName"
                
            FROM transactions t
            LEFT JOIN users u ON t."userId" = u.id
            LEFT JOIN wallets w ON t."walletId" = w.id
            LEFT JOIN virtual_accounts va ON w.id = va."walletId"
            LEFT JOIN users cp ON t."counterpartyId" = cp.id
            LEFT JOIN wallets cpw ON cp.id = cpw."userId"
            LEFT JOIN virtual_accounts cpva ON cpw.id = cpva."walletId"
        `;

        logger.info(`📊 Found ${transactions.length} transactions to migrate`);

        let successCount = 0;
        let errorCount = 0;

        for (const tx of transactions) {
            try {
                const isCredit = parseFloat(tx.amount) > 0;

                let senderName: string;
                let senderAccount: string;
                let senderBankName: string;
                let senderBankCode: string | null = null;
                let senderAvatarUrl: string | null = null;

                let receiverName: string;
                let receiverAccount: string;
                let receiverBankName: string;
                let receiverBankCode: string | null = null;
                let receiverAvatarUrl: string | null = null;

                if (isCredit) {
                    // DEPOSIT: Receiver is the user, Sender is counterparty or external
                    receiverName = `${tx.user_first_name || 'Unknown'} ${tx.user_last_name || 'User'}`;
                    receiverAccount = tx.user_account || '0000000000';
                    receiverBankName = tx.user_bank_name || 'SwapLink Wallet';
                    receiverAvatarUrl = tx.user_avatar;

                    if (tx.counterpartyId && tx.cp_first_name) {
                        // Internal sender
                        senderName = `${tx.cp_first_name} ${tx.cp_last_name}`;
                        senderAccount = tx.cp_account || '0000000000';
                        senderBankName = tx.cp_bank_name || 'SwapLink Wallet';
                        senderAvatarUrl = tx.cp_avatar;
                    } else {
                        // External sender - try metadata first
                        const metadata = tx.metadata as any;
                        senderName =
                            metadata?.originatorName || metadata?.senderName || 'External Source';
                        senderAccount =
                            metadata?.originatorAccount || metadata?.senderAccount || '0000000000';
                        senderBankName =
                            metadata?.originatorBank || metadata?.bankName || 'Unknown Bank';
                        senderBankCode = metadata?.originatorBankCode || null;
                    }
                } else {
                    // WITHDRAWAL/TRANSFER: Sender is the user, Receiver is counterparty or external
                    senderName = `${tx.user_first_name || 'Unknown'} ${tx.user_last_name || 'User'}`;
                    senderAccount = tx.user_account || '0000000000';
                    senderBankName = tx.user_bank_name || 'SwapLink Wallet';
                    senderAvatarUrl = tx.user_avatar;

                    if (tx.counterpartyId && tx.cp_first_name) {
                        // Internal receiver
                        receiverName = `${tx.cp_first_name} ${tx.cp_last_name}`;
                        receiverAccount = tx.cp_account || '0000000000';
                        receiverBankName = tx.cp_bank_name || 'SwapLink Wallet';
                        receiverAvatarUrl = tx.cp_avatar;
                    } else if (tx.destinationAccount) {
                        // External receiver
                        receiverName = tx.destinationName || 'Unknown Beneficiary';
                        receiverAccount = tx.destinationAccount;
                        receiverBankName = tx.destinationBankName || 'External Bank';
                        receiverBankCode = tx.destinationBankCode;
                    } else {
                        // Unknown receiver
                        receiverName = 'Unknown Receiver';
                        receiverAccount = '0000000000';
                        receiverBankName = 'Unknown Bank';
                    }
                }

                // Update the transaction with flattened data
                await prisma.$executeRaw`
                    UPDATE transactions
                    SET 
                        "senderName" = ${senderName},
                        "senderAccount" = ${senderAccount},
                        "senderBankName" = ${senderBankName},
                        "senderBankCode" = ${senderBankCode},
                        "senderAvatarUrl" = ${senderAvatarUrl},
                        "receiverName" = ${receiverName},
                        "receiverAccount" = ${receiverAccount},
                        "receiverBankName" = ${receiverBankName},
                        "receiverBankCode" = ${receiverBankCode},
                        "receiverAvatarUrl" = ${receiverAvatarUrl}
                    WHERE id = ${tx.id}
                `;

                successCount++;

                if (successCount % 100 === 0) {
                    logger.info(
                        `✅ Migrated ${successCount}/${transactions.length} transactions...`
                    );
                }
            } catch (error) {
                errorCount++;
                logger.error(`❌ Error migrating transaction ${tx.id}:`, error);
            }
        }

        logger.info(`\n✨ Migration completed!`);
        logger.info(`   ✅ Success: ${successCount}`);
        logger.info(`   ❌ Errors: ${errorCount}`);
        logger.info(`   📊 Total: ${transactions.length}`);
    } catch (error) {
        logger.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the migration
flattenTransactions()
    .then(() => {
        logger.info('🎉 Migration script completed successfully');
        process.exit(0);
    })
    .catch(error => {
        logger.error('💥 Migration script failed:', error);
        process.exit(1);
    });
