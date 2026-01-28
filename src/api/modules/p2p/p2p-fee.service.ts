export interface FeeBreakdown {
    makerFee: number;
    takerFee: number;
    totalFee: number;
}

export class P2PFeeService {
    private readonly FEE_PERCENTAGE = 0.01; // 1%

    /**
     * Calculate the fee for a P2P order.
     * Total Fee = 1% of the transaction amount.
     * Split = 0.5% Maker, 0.5% Taker.
     */
    calculateOrderFee(amount: number): FeeBreakdown {
        const totalFee = amount * this.FEE_PERCENTAGE;
        const splitFee = totalFee / 2;

        return {
            makerFee: splitFee,
            takerFee: splitFee,
            totalFee: totalFee,
        };
    }
}

export const p2pFeeService = new P2PFeeService();
