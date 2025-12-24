export function isEmpty(data: any) {
    return !data;
}

export function formatUserInfo(user: any) {
    const { password: _, wallet, ...userWithoutPassword } = user;
    return {
        ...userWithoutPassword,
        wallet: wallet
            ? {
                  id: wallet.id,
                  balance: Number(wallet.balance),
                  lockedBalance: Number(wallet.lockedBalance),
                  accountNumber: wallet.virtualAccount?.accountNumber,
                  bankName: wallet.virtualAccount?.bankName,
                  accountName: wallet.virtualAccount?.accountName,
              }
            : null,
    };
}

/**
 * Delays the execution of the code for the specified number of seconds.
 * @param seconds The number of seconds to delay.
 * @returns A promise that resolves after the specified number of seconds.
 */
export function delay(seconds: number) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
