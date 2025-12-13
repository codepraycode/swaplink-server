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
              }
            : null,
    };
}
