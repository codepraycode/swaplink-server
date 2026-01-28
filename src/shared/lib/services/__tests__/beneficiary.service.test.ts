import { beneficiaryService } from '../../../../api/modules/wallet/beneficiary.service';
import { prisma } from '../../../database';

// Mock dependencies
jest.mock('../../../database', () => ({
    prisma: {
        beneficiary: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            findMany: jest.fn(),
        },
    },
}));

describe('BeneficiaryService', () => {
    const mockUserId = 'user-123';
    const mockData = {
        userId: mockUserId,
        accountNumber: '1234567890',
        accountName: 'John Doe',
        bankCode: '058',
        bankName: 'GTBank',
        isInternal: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createBeneficiary', () => {
        it('should create new beneficiary if not exists', async () => {
            (prisma.beneficiary.findUnique as jest.Mock).mockResolvedValue(null);
            (prisma.beneficiary.create as jest.Mock).mockResolvedValue({
                id: 'ben-1',
                ...mockData,
            });

            const result = await beneficiaryService.createBeneficiary(mockData);

            expect(result).toEqual({ id: 'ben-1', ...mockData });
            expect(prisma.beneficiary.create).toHaveBeenCalledWith({ data: mockData });
        });

        it('should update existing beneficiary if exists', async () => {
            (prisma.beneficiary.findUnique as jest.Mock).mockResolvedValue({
                id: 'ben-1',
                ...mockData,
            });
            (prisma.beneficiary.update as jest.Mock).mockResolvedValue({
                id: 'ben-1',
                ...mockData,
                updatedAt: new Date(),
            });

            await beneficiaryService.createBeneficiary(mockData);

            expect(prisma.beneficiary.update).toHaveBeenCalledWith({
                where: { id: 'ben-1' },
                data: { updatedAt: expect.any(Date) },
            });
        });
    });

    describe('getBeneficiaries', () => {
        it('should return list of beneficiaries', async () => {
            const mockList = [{ id: 'ben-1', ...mockData }];
            (prisma.beneficiary.findMany as jest.Mock).mockResolvedValue(mockList);

            const result = await beneficiaryService.getBeneficiaries(mockUserId);

            expect(result).toEqual(mockList);
            expect(prisma.beneficiary.findMany).toHaveBeenCalledWith({
                where: { userId: mockUserId },
                orderBy: { updatedAt: 'desc' },
                take: 20,
            });
        });
    });
});
