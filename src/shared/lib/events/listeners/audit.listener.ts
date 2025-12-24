import { eventBus, EventType } from '../event-bus';
import logger from '../../utils/logger';
import { prisma } from '../../../database';

export interface AuditLogData {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    status?: 'SUCCESS' | 'FAILURE';
}

export function setupAuditListeners() {
    eventBus.subscribe(EventType.AUDIT_LOG, async (data: AuditLogData) => {
        try {
            logger.info(`[AuditListener] Processing audit log: ${data.action}`);

            await prisma.auditLog.create({
                data: {
                    userId: data.userId,
                    action: data.action,
                    resource: data.resource,
                    resourceId: data.resourceId,
                    details: data.details,
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                    status: data.status || 'SUCCESS',
                },
            });

            logger.info(`[AuditListener] Audit log saved: ${data.action}`);
        } catch (error) {
            logger.error('[AuditListener] Failed to save audit log:', error);
        }
    });
}
