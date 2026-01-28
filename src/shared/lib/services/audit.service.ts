import { eventBus, EventType } from '../events/event-bus';
import { prisma } from '../../database';
import { AuditLogData } from '../events/listeners/audit.listener';
import { Prisma } from '@prisma/client';

export interface AuditLogFilter {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
}

export class AuditService {
    /**
     * Emit an audit log event
     */
    static async log(data: AuditLogData): Promise<void> {
        eventBus.publish(EventType.AUDIT_LOG, data);
    }

    /**
     * Retrieve audit logs with filtering and pagination
     */
    static async findAll(filter: AuditLogFilter) {
        const { userId, action, resource, startDate, endDate, page = 1, limit = 20 } = filter;
        const skip = (page - 1) * limit;

        const where: Prisma.AuditLogWhereInput = {};

        if (userId) where.userId = userId;
        if (action) where.action = { contains: action, mode: 'insensitive' };
        if (resource) where.resource = { contains: resource, mode: 'insensitive' };

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = startDate;
            if (endDate) where.createdAt.lte = endDate;
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            }),
            prisma.auditLog.count({ where }),
        ]);

        return {
            logs,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
