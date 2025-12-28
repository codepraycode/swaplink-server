import { pinService } from '../../../../api/modules/wallet/pin.service';
import { prisma } from '../../../database';
import bcrypt from 'bcrypt';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/api-error';

// Mock dependencies
jest.mock('../../../database', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
    },
}));

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

describe('PinService', () => {
    const mockUserId = 'user-123';
    const mockPin = '1234';
    const mockHashedPin = 'hashed-pin';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('setPin', () => {
        it('should set PIN successfully for new user', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: mockUserId,
                transactionPin: null,
            });
            (bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPin);
            (prisma.user.update as jest.Mock).mockResolvedValue({});

            const result = await pinService.setPin(mockUserId, mockPin);

            expect(result).toEqual({ message: 'Transaction PIN set successfully' });
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: mockUserId },
                data: { transactionPin: mockHashedPin },
            });
        });

        it('should throw BadRequestError if PIN already set', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: mockUserId,
                transactionPin: 'existing-pin',
            });

            await expect(pinService.setPin(mockUserId, mockPin)).rejects.toThrow(BadRequestError);
        });

        it('should throw BadRequestError for invalid PIN format', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: mockUserId,
                transactionPin: null,
            });

            await expect(pinService.setPin(mockUserId, '123')).rejects.toThrow(BadRequestError);
            await expect(pinService.setPin(mockUserId, 'abc4')).rejects.toThrow(BadRequestError);
        });
    });

    describe('verifyPin', () => {
        it('should return true for correct PIN', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: mockUserId,
                transactionPin: mockHashedPin,
                pinAttempts: 0,
                pinLockedUntil: null,
            });
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await pinService.verifyPin(mockUserId, mockPin);

            expect(result).toBe(true);
        });

        it('should throw ForbiddenError for incorrect PIN and increment attempts', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: mockUserId,
                transactionPin: mockHashedPin,
                pinAttempts: 0,
                pinLockedUntil: null,
            });
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(pinService.verifyPin(mockUserId, 'wrong')).rejects.toThrow(ForbiddenError);

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: mockUserId },
                data: { pinAttempts: 1, pinLockedUntil: null },
            });
        });

        it('should lock user after 3 failed attempts', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: mockUserId,
                transactionPin: mockHashedPin,
                pinAttempts: 2,
                pinLockedUntil: null,
            });
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(pinService.verifyPin(mockUserId, 'wrong')).rejects.toThrow(ForbiddenError);

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: mockUserId },
                data: {
                    pinAttempts: 3,
                    pinLockedUntil: expect.any(Date),
                },
            });
        });

        it('should throw ForbiddenError if user is locked', async () => {
            const futureDate = new Date();
            futureDate.setHours(futureDate.getHours() + 1);

            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: mockUserId,
                transactionPin: mockHashedPin,
                pinAttempts: 3,
                pinLockedUntil: futureDate,
            });

            await expect(pinService.verifyPin(mockUserId, mockPin)).rejects.toThrow(ForbiddenError);
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });
    });
});
