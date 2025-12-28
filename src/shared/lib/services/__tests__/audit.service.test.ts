import { AuditService } from '../audit.service';
import { eventBus, EventType } from '../../events/event-bus';
import { prisma } from '../../../database';

// Mock dependencies
jest.mock('../../events/event-bus');
jest.mock('../../../database', () => ({
    prisma: {
        auditLog: {
            create: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
        },
    },
}));

describe('AuditService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('log', () => {
        it('should publish AUDIT_LOG event', async () => {
            const logData = {
                userId: 'user-123',
                action: 'TEST_ACTION',
                resource: 'TestResource',
                status: 'SUCCESS' as const,
            };

            await AuditService.log(logData);

            expect(eventBus.publish).toHaveBeenCalledWith(EventType.AUDIT_LOG, logData);
        });
    });

    describe('findAll', () => {
        it('should retrieve audit logs with pagination', async () => {
            const mockLogs = [{ id: '1', action: 'TEST_ACTION', createdAt: new Date() }];
            const mockTotal = 1;

            (prisma.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs);
            (prisma.auditLog.count as jest.Mock).mockResolvedValue(mockTotal);

            const result = await AuditService.findAll({ page: 1, limit: 10 });

            expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    skip: 0,
                    take: 10,
                })
            );
            expect(result.logs).toEqual(mockLogs);
            expect(result.meta.total).toBe(mockTotal);
        });
    });
});
