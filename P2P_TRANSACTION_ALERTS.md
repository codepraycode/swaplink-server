# P2P Transaction Alerts - User View

## Example Scenario: John Buys 250 USD from Alice

### Setup

-   **John** (Buyer): Creates BUY_FX ad - wants to buy USD with NGN
-   **Alice** (Seller): Responds to ad - sells USD for NGN
-   **Order Details**:
    -   Amount: 250 USD
    -   Rate: 1500 NGN/USD
    -   Total: 375,000 NGN
    -   Fee: 3,750 NGN (1%)
    -   Net to Alice: 371,250 NGN

---

## John's Transaction Alert (DEBIT)

```json
{
    "type": "TRANSFER",
    "amount": -375000,
    "balanceBefore": 2000000,
    "balanceAfter": 1625000,
    "status": "COMPLETED",
    "reference": "P2P-DEBIT-8e05edc7",
    "description": "P2P Purchase: 250 USD @ ₦1500/USD",
    "metadata": {
        "orderId": "8e05edc7-1665-42a7-b5a9-c181c1d572e9",
        "type": "BUY_FX",
        "currency": "USD",
        "fxAmount": 250,
        "rate": 1500,
        "fee": 3750,
        "counterpartyId": "alice-user-id"
    },
    "createdAt": "2025-12-31T16:30:00.000Z"
}
```

**User-Friendly Display:**

```
🔴 DEBIT ALERT
₦375,000.00

P2P Purchase: 250 USD @ ₦1500/USD
Order #8e05edc7

Balance: ₦2,000,000 → ₦1,625,000
Date: Dec 31, 2025 4:30 PM
Reference: P2P-DEBIT-8e05edc7
```

---

## Alice's Transaction Alert (CREDIT)

```json
{
    "type": "DEPOSIT",
    "amount": 371250,
    "balanceBefore": 500000,
    "balanceAfter": 871250,
    "status": "COMPLETED",
    "reference": "P2P-CREDIT-8e05edc7",
    "description": "P2P Sale: 250 USD @ ₦1500/USD (Fee: ₦3750)",
    "metadata": {
        "orderId": "8e05edc7-1665-42a7-b5a9-c181c1d572e9",
        "type": "SELL_FX",
        "currency": "USD",
        "fxAmount": 250,
        "rate": 1500,
        "grossAmount": 375000,
        "fee": 3750,
        "netAmount": 371250,
        "counterpartyId": "john-user-id"
    },
    "createdAt": "2025-12-31T16:30:00.000Z"
}
```

**User-Friendly Display:**

```
🟢 CREDIT ALERT
₦371,250.00

P2P Sale: 250 USD @ ₦1500/USD
Order #8e05edc7

Gross: ₦375,000
Fee: ₦3,750
Net: ₦371,250

Balance: ₦500,000 → ₦871,250
Date: Dec 31, 2025 4:30 PM
Reference: P2P-CREDIT-8e05edc7
```

---

## Reverse Scenario: Alice Buys 250 USD from John

### Setup

-   **John** (Seller): Creates SELL_FX ad - wants to sell USD for NGN
-   **Alice** (Buyer): Responds to ad - buys USD with NGN
-   **Order Details**: Same as above

---

## Alice's Transaction Alert (DEBIT)

```json
{
    "type": "TRANSFER",
    "amount": -375000,
    "balanceBefore": 500000,
    "balanceAfter": 125000,
    "status": "COMPLETED",
    "reference": "P2P-DEBIT-9f16fde8",
    "description": "P2P Purchase: 250 USD @ ₦1500/USD",
    "metadata": {
        "orderId": "9f16fde8-2776-53b8-c6a0-d292d2e683f0",
        "type": "BUY_FX",
        "currency": "USD",
        "fxAmount": 250,
        "rate": 1500,
        "fee": 3750,
        "counterpartyId": "john-user-id"
    }
}
```

**User-Friendly Display:**

```
🔴 DEBIT ALERT
₦375,000.00

P2P Purchase: 250 USD @ ₦1500/USD
Order #9f16fde8

Balance: ₦500,000 → ₦125,000
Date: Dec 31, 2025 5:00 PM
Reference: P2P-DEBIT-9f16fde8
```

---

## John's Transaction Alert (CREDIT)

```json
{
    "type": "DEPOSIT",
    "amount": 371250,
    "balanceBefore": 2000000,
    "balanceAfter": 2371250,
    "status": "COMPLETED",
    "reference": "P2P-CREDIT-9f16fde8",
    "description": "P2P Sale: 250 USD @ ₦1500/USD (Fee: ₦3750)",
    "metadata": {
        "orderId": "9f16fde8-2776-53b8-c6a0-d292d2e683f0",
        "type": "SELL_FX",
        "currency": "USD",
        "fxAmount": 250,
        "rate": 1500,
        "grossAmount": 375000,
        "fee": 3750,
        "netAmount": 371250,
        "counterpartyId": "alice-user-id"
    }
}
```

**User-Friendly Display:**

```
🟢 CREDIT ALERT
₦371,250.00

P2P Sale: 250 USD @ ₦1500/USD
Order #9f16fde8

Gross: ₦375,000
Fee: ₦3,750
Net: ₦371,250

Balance: ₦2,000,000 → ₦2,371,250
Date: Dec 31, 2025 5:00 PM
Reference: P2P-CREDIT-9f16fde8
```

---

## Key Features

### ✅ Proper Balance Tracking

-   `balanceBefore` and `balanceAfter` show the actual balance change
-   Payer sees their balance decrease
-   Receiver sees their balance increase

### ✅ Clear Descriptions

-   **Payer**: "P2P Purchase: {amount} {currency} @ ₦{rate}/{currency}"
-   **Receiver**: "P2P Sale: {amount} {currency} @ ₦{rate}/{currency} (Fee: ₦{fee})"

### ✅ Rich Metadata

-   Order ID for reference
-   Transaction type (BUY_FX or SELL_FX)
-   Currency and FX amount
-   Exchange rate
-   Fee breakdown (for receiver)
-   Counterparty ID (for support/disputes)

### ✅ Unique References

-   Payer: `P2P-DEBIT-{orderId}`
-   Receiver: `P2P-CREDIT-{orderId}`
-   Revenue: `P2P-FEE-{orderId}`

---

## Mobile App Integration

The mobile app can use this data to show:

1. **Transaction List**: Debit/Credit with amounts and descriptions
2. **Transaction Details**: Full breakdown with all metadata
3. **Push Notifications**: "You received ₦371,250 from P2P Sale"
4. **Order History**: Link transactions to orders via `orderId` in metadata
