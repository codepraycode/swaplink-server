/**
 * Utility functions for formatting sensitive data in emails and notifications
 */

/**
 * Scrambles an account number for security, showing only the last 4 digits
 * Example: "1234567890" => "******7890"
 *
 * @param accountNumber - The full account number to scramble
 * @param visibleDigits - Number of digits to show at the end (default: 4)
 * @returns Scrambled account number
 */
export function scrambleAccountNumber(accountNumber: string, visibleDigits: number = 4): string {
    if (!accountNumber || accountNumber.length <= visibleDigits) {
        return accountNumber;
    }

    const visible = accountNumber.slice(-visibleDigits);
    const scrambled = '*'.repeat(accountNumber.length - visibleDigits);

    return scrambled + visible;
}

/**
 * Formats a transaction reference for display
 * Ensures it's always shown in a consistent format
 *
 * @param reference - The transaction reference
 * @returns Formatted reference
 */
export function formatTransactionReference(reference: string | undefined | null): string {
    if (!reference) {
        return 'N/A';
    }

    return reference.toUpperCase();
}

/**
 * Scrambles a bank account number with bank name for display
 * Example: "Globus Bank - 1234567890" => "Globus Bank - ******7890"
 *
 * @param bankName - Name of the bank
 * @param accountNumber - The account number to scramble
 * @returns Formatted bank and scrambled account
 */
export function formatBankAccount(bankName: string, accountNumber: string): string {
    return `${bankName} - ${scrambleAccountNumber(accountNumber)}`;
}

/**
 * Formats currency amount with proper separators
 * Example: "1000000" => "1,000,000.00"
 *
 * @param amount - The amount to format
 * @param currency - Currency symbol (default: '₦')
 * @returns Formatted amount
 */
export function formatCurrencyAmount(amount: string | number, currency: string = '₦'): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(numAmount)) {
        return `${currency}0.00`;
    }

    return `${currency}${numAmount.toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

/**
 * Formats a transaction object for client consumption
 * Scrambles account numbers and ensures reference is always present
 *
 * @param transaction - The raw transaction object from database
 * @returns Formatted transaction safe for client
 */
export function formatTransactionForClient(transaction: any): any {
    if (!transaction) return null;

    return {
        ...transaction,
        // Ensure reference is always present and formatted
        reference: formatTransactionReference(transaction.reference || transaction.id),
        // Scramble account numbers if they exist at root level
        senderAccount: transaction.senderAccount
            ? scrambleAccountNumber(transaction.senderAccount)
            : undefined,
        receiverAccount: transaction.receiverAccount
            ? scrambleAccountNumber(transaction.receiverAccount)
            : undefined,
        // If transaction has nested sender/receiver objects, format those too
        sender: transaction.sender
            ? {
                  ...transaction.sender,
                  accountNumber: transaction.sender.accountNumber
                      ? scrambleAccountNumber(transaction.sender.accountNumber)
                      : undefined,
              }
            : undefined,
        receiver: transaction.receiver
            ? {
                  ...transaction.receiver,
                  accountNumber: transaction.receiver.accountNumber
                      ? scrambleAccountNumber(transaction.receiver.accountNumber)
                      : undefined,
              }
            : undefined,
    };
}
