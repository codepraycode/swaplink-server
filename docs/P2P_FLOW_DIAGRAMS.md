# P2P Flow Visual Diagram

## 🎨 BUY_FX Ad Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         BUY_FX AD                               │
│                  (Maker wants to buy FX)                        │
└─────────────────────────────────────────────────────────────────┘

Step 1: Ad Creation
┌──────────────┐
│    ALICE     │  Creates BUY_FX ad: "I want to buy 100 USD"
│   (Maker)    │
│              │  ✅ Locks 150,000 NGN in escrow
│  userSide:   │  ✅ Provides USD bank account
│   BUYER      │
└──────────────┘  Display: "BUY 100 USD"


Step 2: Order Creation
┌──────────────┐
│     BOB      │  Creates order: "I'll sell you 50 USD"
│   (Taker)    │
│              │  ❌ No Naira locking (Alice already locked)
│  userSide:   │
│   SELLER     │
└──────────────┘  Display: "SELL 50 USD"


Step 3: FX Transfer
┌──────────────┐
│     BOB      │  Sends 50 USD to Alice's bank account
│  (FX Sender) │
│              │  ✅ Uploads proof of transfer
│              │
└──────────────┘  Order status: PENDING → PAID


Step 4: Confirmation
┌──────────────┐
│    ALICE     │  Checks bank account, sees 50 USD
│ (FX Receiver)│
│              │  ✅ Confirms receipt
│              │
└──────────────┘  Order status: PAID → PROCESSING


Step 5: Fund Release
┌──────────────┐
│     BOB      │  Receives 74,250 NGN (from Alice's locked funds)
│ (NGN Receiver)│
│              │
│              │
└──────────────┘  Order status: PROCESSING → COMPLETED

┌──────────────┐
│    ALICE     │  50,000 NGN locked balance released
│  (NGN Payer) │  Revenue: 750 NGN (1% fee)
│              │
│              │
└──────────────┘
```

---

## 🎨 SELL_FX Ad Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        SELL_FX AD                               │
│                  (Maker wants to sell FX)                       │
└─────────────────────────────────────────────────────────────────┘

Step 1: Ad Creation
┌──────────────┐
│    ALICE     │  Creates SELL_FX ad: "I want to sell 100 USD"
│   (Maker)    │
│              │  ❌ No Naira locking
│  userSide:   │
│   SELLER     │
└──────────────┘  Display: "SELL 100 USD"


Step 2: Order Creation
┌──────────────┐
│     BOB      │  Creates order: "I'll buy 50 USD from you"
│   (Taker)    │
│              │  ✅ Locks 75,000 NGN in escrow
│  userSide:   │  ✅ Provides USD bank account
│   BUYER      │
└──────────────┘  Display: "BUY 50 USD"


Step 3: FX Transfer
┌──────────────┐
│    ALICE     │  Sends 50 USD to Bob's bank account
│  (FX Sender) │
│              │  ✅ Uploads proof of transfer
│              │
└──────────────┘  Order status: PENDING → PAID


Step 4: Confirmation
┌──────────────┐
│     BOB      │  Checks bank account, sees 50 USD
│ (FX Receiver)│
│              │  ✅ Confirms receipt
│              │
└──────────────┘  Order status: PAID → PROCESSING


Step 5: Fund Release
┌──────────────┐
│    ALICE     │  Receives 74,250 NGN (from Bob's locked funds)
│ (NGN Receiver)│
│              │
│              │
└──────────────┘  Order status: PROCESSING → COMPLETED

┌──────────────┐
│     BOB      │  75,000 NGN locked balance released
│  (NGN Payer) │  Revenue: 750 NGN (1% fee)
│              │
│              │
└──────────────┘
```

---

## 🎯 User Side Determination

```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND CALCULATION                          │
└─────────────────────────────────────────────────────────────────┘

Input:
  - order.ad.type (BUY_FX or SELL_FX)
  - order.makerId
  - order.takerId
  - userId (authenticated user)

Logic:
  isBuyAd = order.ad.type === 'BUY_FX'

  buyer = isBuyAd ? order.maker : order.taker
  seller = isBuyAd ? order.taker : order.maker

  userSide = userId === buyer.id ? 'BUYER' : 'SELLER'

Output:
  {
    buyer: { id, firstName, ... },
    seller: { id, firstName, ... },
    userSide: 'BUYER' | 'SELLER'
  }
```

---

## 🎯 Mobile App Display Logic

```
┌─────────────────────────────────────────────────────────────────┐
│                    MOBILE APP LOGIC                             │
└─────────────────────────────────────────────────────────────────┘

Input:
  - order.userSide (from backend)

Logic:
  isBuy = order.userSide === 'BUYER'

  action = isBuy ? 'BUY' : 'SELL'
  counterparty = isBuy ? order.seller : order.buyer
  counterpartyRole = isBuy ? 'FX Sender' : 'FX Receiver'

Display:
  "{action} {amount} {currency}"
  "{counterpartyRole}: {counterparty.firstName}"
```

---

## 📊 Decision Matrix

```
┌──────────┬───────────┬────────────┬──────────┬─────────────┐
│ Ad Type  │ User Role │ Locks NGN? │ userSide │   Display   │
├──────────┼───────────┼────────────┼──────────┼─────────────┤
│ BUY_FX   │   Maker   │     ✅     │  BUYER   │  "BUY USD"  │
│ BUY_FX   │   Taker   │     ❌     │  SELLER  │ "SELL USD"  │
│ SELL_FX  │   Maker   │     ❌     │  SELLER  │ "SELL USD"  │
│ SELL_FX  │   Taker   │     ✅     │  BUYER   │  "BUY USD"  │
└──────────┴───────────┴────────────┴──────────┴─────────────┘
```

---

## 🔄 Order Status Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      ORDER LIFECYCLE                            │
└─────────────────────────────────────────────────────────────────┘

PENDING
   │
   │  FX Sender uploads proof
   ▼
PAID
   │
   │  FX Receiver confirms receipt
   ▼
PROCESSING
   │
   │  Worker releases funds
   ▼
COMPLETED


Alternative Flow:

PENDING
   │
   │  Order creator cancels
   ▼
CANCELLED
```

---

## 🎯 Action Buttons Logic

```
┌─────────────────────────────────────────────────────────────────┐
│                    WHO CAN DO WHAT?                             │
└─────────────────────────────────────────────────────────────────┘

Upload Proof (PENDING → PAID):
  ✅ userSide === 'SELLER' (FX Sender)
  ❌ userSide === 'BUYER' (NGN Payer)

Confirm Receipt (PAID → PROCESSING):
  ✅ userSide === 'BUYER' (FX Receiver)
  ❌ userSide === 'SELLER' (FX Sender)

Cancel Order (PENDING → CANCELLED):
  ✅ Order creator only
  ❌ Other party
```

---

## 🎯 The Golden Rule

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   "Whoever has his money locked in escrow is the BUYER"        │
│                                                                 │
│   BUYER  = Pays Naira (has funds in escrow)                    │
│   SELLER = Expects Naira (will receive from escrow)            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
