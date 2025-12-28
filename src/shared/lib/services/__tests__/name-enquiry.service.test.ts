import { nameEnquiryService } from '../../../../api/modules/wallet/name-enquiry.service';
import { prisma } from '../../../database';
import { BadRequestError } from '../../utils/api-error';

// Mock dependencies
jest.mock('../../../database', () => ({
    prisma: {
        virtualAccount: {
            findUnique: jest.fn(),
        },
    },
}));

jest.mock('../../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
}));

describe('NameEnquiryService', () => {
    const mockAccountNumber = '1234567890';
    const mockBankCode = '058';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('resolveAccount', () => {
        it('should resolve internal account successfully', async () => {
            (prisma.virtualAccount.findUnique as jest.Mock).mockResolvedValue({
                accountNumber: mockAccountNumber,
                accountName: 'Internal User',
                wallet: {
                    user: {
                        firstName: 'Internal',
                        lastName: 'User',
                    },
                },
            });

            const result = await nameEnquiryService.resolveAccount(mockAccountNumber, mockBankCode);

            expect(result).toEqual({
                accountName: 'Internal User',
                bankName: 'SwapLink (Globus)',
                isInternal: true,
            });
        });

        it('should resolve external account successfully (mocked)', async () => {
            (prisma.virtualAccount.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await nameEnquiryService.resolveAccount(mockAccountNumber, mockBankCode);

            expect(result).toEqual({
                accountName: 'MOCKED EXTERNAL USER',
                bankName: 'External Bank',
                isInternal: false,
                sessionId: '999999999999',
            });
        });

        it('should throw BadRequestError for invalid account number length', async () => {
            (prisma.virtualAccount.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(nameEnquiryService.resolveAccount('123', mockBankCode)).rejects.toThrow(
                BadRequestError
            );
        });
    });
});
