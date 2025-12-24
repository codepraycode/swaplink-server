# Software Requirement Specification: P2P Exchange Module

## 1. Overview

The P2P module allows users to trade NGN for supported foreign currencies (USD, CAD, EUR, GBP).

-   **Asset:** NGN (Held in SwapLink Wallet).
-   **Counter-Asset:** FX (Sent externally).
-   **Mechanism:** Escrow (The NGN is locked by the system until the FX transfer is confirmed).

## 2. Terminology

-   **Maker (Advertiser):** The user who creates a Post (Ad).
-   **Taker:** The user who clicks on an existing Ad.
-   **Buyer:** The person paying NGN to get FX.
-   **Seller:** The person paying FX to get NGN.
-   **Escrow:** The state where NGN is deducted from the Buyer's available balance but not yet credited to the Seller.

---

## 3. Functional Requirements (FR)

### 3.1 Payment Methods (External Accounts)

-   **FR-01:** Users must be able to save external foreign bank details (e.g., "My US Chase Account", "My UK Monzo").
-   **FR-02:** Fields required per currency:
    -   **USD:** Account Name, Account Number, Routing Number (ACH/FedWire), Bank Name.
    -   **EUR:** Account Name, IBAN, BIC/SWIFT.
    -   **GBP:** Account Name, Sort Code, Account Number.
    -   **CAD:** Account Name, Institution No, Transit No, Account No.
-   **FR-03:** These details are encrypted and only revealed to the counterparty during an active order.

### 3.2 Ad Creation (The "Maker" Flow)

#### Case A: "Buy FX" Ad (I have NGN, I want USD)

-   **FR-04:** User selects Currency (USD), inputs Total Amount (e.g., $1000), Rate (e.g., ₦1500/$), and Limits (Min $100 - Max $1000).
-   **FR-05:** **Liquidity Check:** The system checks if the User has enough NGN in their wallet to cover the _entire_ ad size (e.g., 1000 \* 1500 = ₦1.5M).
-   **FR-06:** **Funds Locking:** To prevent fraud, the NGN amount is **Locked** (moved to `lockedBalance`) immediately upon Ad creation.

#### Case B: "Sell FX" Ad (I have USD, I want NGN)

-   **FR-07:** User selects Currency (USD), inputs Amount ($1000), Rate (e.g., ₦1450/$), Limits.
-   **FR-08:** User selects one of their saved **Payment Methods** (where they want to receive the USD).
-   **FR-09:** No NGN is locked (because they are receiving NGN).

### 3.3 Order Execution (The "Taker" Flow)

-   **FR-10:** Taker browses the P2P Feed (filtered by Currency and Buy/Sell).
-   **FR-11:** Taker clicks an Ad and enters amount.
-   **FR-12:** **The Escrow Logic:**
    -   Regardless of who is Maker/Taker, **The NGN Payer's funds are always locked.**
    -   If Taker is the NGN Payer: Deduct NGN from Taker -> Hold in Escrow.
    -   If Maker is the NGN Payer: Funds were already locked. Allocate them to this specific Order.

### 3.4 The Transaction Lifecycle (State Machine)

1.  **CREATED:** Order opened. NGN locked in Escrow.
2.  **PAID:** The FX Payer clicks "I have sent the money".
3.  **COMPLETED:** The FX Receiver confirms receipt. NGN moved from Escrow to Receiver.
4.  **DISPUTE:** FX Receiver claims money didn't arrive. Admin intervention required.
5.  **CANCELLED:** Order timeout or manual cancellation. NGN returned to Payer.

### 3.5 Chat & Evidence

-   **FR-13:** A real-time chat (Socket.io) is opened for every order.
-   **FR-14:** Users can upload images (Proof of Payment receipts) in the chat.
-   **FR-15:** System messages (e.g., "User marked as Paid") appear in the chat stream.

### 3.6 Auto-Reply & Terms

-   **FR-16:** Makers can set an "Auto-Reply" message sent immediately when an order starts (e.g., "I don't accept Zelle, only Wire").
-   **FR-17:** Makers can set "Terms" visible before the Taker clicks the ad.

---

## 4. Non-Functional Requirements (NFR)

### NFR-01: Performance (Polling vs Sockets)

-   **Ad Feed:** Use **Polling** (every 10-15 seconds) or "Pull to Refresh". The feed doesn't need to be instant.
-   **Order Status:** Use **WebSockets**. When the buyer clicks "Paid", the seller's screen must update instantly.
-   **Chat:** Use **WebSockets**.

### NFR-02: Timeout Logic

-   **Rule:** If the FX Payer does not mark the order as "PAID" within **15 minutes** (configurable), the order auto-cancels and NGN is returned to the NGN Payer.

### NFR-03: Dispute Safety

-   **Rule:** Once marked as "PAID", the NGN Payer _cannot_ cancel the order. Only the FX Receiver (or Admin) can release/cancel.

---

## 5. Schema Updates

We need models for Ads, Orders, Payment Methods, and Chat.

```prisma
// ==========================================
// P2P MODULE
// ==========================================

model P2PPaymentMethod {
  id            String   @id @default(uuid())
  userId        String
  currency      String   // USD, CAD, EUR, GBP
  bankName      String
  accountNumber String
  accountName   String
  details       Json     // Dynamic fields (Routing No, IBAN, Sort Code)
  isActive      Boolean  @default(true)

  ads           P2PAd[]

  user          User     @relation(fields: [userId], references: [id])
  @@map("p2p_payment_methods")
}

model P2PAd {
  id              String   @id @default(uuid())
  userId          String
  type            AdType   // BUY_FX or SELL_FX
  currency        String   // USD, EUR...

  totalAmount     Float    // Initial amount (e.g. 1000 USD)
  remainingAmount Float    // Amount left (e.g. 200 USD)
  price           Float    // NGN per Unit (e.g. 1500)

  minLimit        Float    // Min order size
  maxLimit        Float    // Max order size

  paymentMethodId String?  // Required if User is RECEIVING FX

  terms           String?
  autoReply       String?
  status          AdStatus @default(ACTIVE)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User              @relation(fields: [userId], references: [id])
  paymentMethod   P2PPaymentMethod? @relation(fields: [paymentMethodId], references: [id])
  orders          P2POrder[]

  @@map("p2p_ads")
}

model P2POrder {
  id              String      @id @default(uuid())
  adId            String
  makerId         String      // Owner of Ad
  takerId         String      // Person who clicked Ad

  amount          Float       // Amount in FX (e.g. 100 USD)
  price           Float       // Rate locked at creation
  totalNgn        Float       // amount * price (e.g. 150,000 NGN)

  status          OrderStatus @default(PENDING)
  paymentProofUrl String?     // Image URL

  expiresAt       DateTime    // 15 mins from creation
  completedAt     DateTime?

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  ad              P2PAd       @relation(fields: [adId], references: [id])
  maker           User        @relation("MakerOrders", fields: [makerId], references: [id])
  taker           User        @relation("TakerOrders", fields: [takerId], references: [id])
  messages        P2PChat[]
  dispute         P2PDispute? // Optional relation if dispute raised

  @@map("p2p_orders")
}

model P2PChat {
  id        String   @id @default(uuid())
  orderId   String
  senderId  String
  message   String?
  imageUrl  String?
  type      ChatType @default(TEXT) // TEXT, SYSTEM
  createdAt DateTime @default(now())

  order     P2POrder @relation(fields: [orderId], references: [id])
  sender    User     @relation(fields: [senderId], references: [id])

  @@map("p2p_chats")
}

// Enums
enum AdType {
  BUY_FX   // Advertiser Gives NGN, Wants FX
  SELL_FX  // Advertiser Gives FX, Wants NGN
}

enum AdStatus {
  ACTIVE
  PAUSED
  COMPLETED // Amount exhausted
  CLOSED    // Manually closed
}

enum OrderStatus {
  PENDING
  PAID        // FX Payer confirmed sending
  COMPLETED   // NGN Payer confirmed receiving
  CANCELLED
  DISPUTE
}

enum ChatType {
  TEXT
  IMAGE
  SYSTEM      // "User marked order as paid"
}
```

---

## 6. Implementation Strategy

### 6.1 The "Ad Feed" (Polling)

-   **Query:** `SELECT * FROM P2PAd WHERE status = 'ACTIVE' AND currency = 'USD' AND remainingAmount > 0`.
-   **Optimization:** Create a DB Index on `[status, currency, price]`.

### 6.2 The Order Service (Locking)

This is the most critical logic.

-   **Scenario:** User A (Taker) wants to buy $100 from User B's Ad (Rate 1500).
-   **Action:**
    1.  Start DB Transaction.
    2.  Check User A's Wallet: `availableBalance >= 150,000`.
    3.  Debit User A: `balance - 150,000`.
    4.  Update User A: `lockedBalance + 150,000`.
    5.  Update Ad: `remainingAmount - 100`.
    6.  Create Order.
    7.  Emit Socket Event to User B ("New Order!").

### 6.3 The Completion Service (Releasing)

-   **Scenario:** User A (Receiver of FX) confirms receipt.
-   **Action:**
    1.  Start DB Transaction.
    2.  Get Payer's Wallet (Funds are in `lockedBalance`).
    3.  Payer Wallet: `lockedBalance - 150,000`.
    4.  Receiver Wallet: `balance + 150,000`.
    5.  Update Order: `COMPLETED`.
    6.  Create `Transaction` records (Type: P2P_TRADE).

---

## 7. Next Steps

1.  **Run Migration:** Add the P2P models.
2.  **Payment Method Module:** Build CRUD for saving bank details.
3.  **Ad Module:** Build endpoints to Create/Edit/Close Ads.
4.  **Order Module:** The state machine logic.

Do you want to start with the **Payment Method** CRUD (Simple) or jump straight into the **Ad Creation Logic** (Complex)?
