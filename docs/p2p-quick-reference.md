# P2P Quick Reference Card

## Ad Types

| Ad Type     | Meaning             | Maker Action                | Taker Action                |
| ----------- | ------------------- | --------------------------- | --------------------------- |
| **BUY_FX**  | "I want to buy FX"  | Pays Naira<br/>Receives FX  | Sends FX<br/>Receives Naira |
| **SELL_FX** | "I want to sell FX" | Sends FX<br/>Receives Naira | Pays Naira<br/>Receives FX  |

## Who Does What?

### BUY_FX Ad

-   **Maker**: Locks Naira → Receives FX → **Confirms receipt**
-   **Taker**: Sends FX → **Uploads proof** → Receives Naira

### SELL_FX Ad

-   **Maker**: Sends FX → **Uploads proof** → Receives Naira
-   **Taker**: Locks Naira → Receives FX → **Confirms receipt**

## Golden Rules

1. **FX sender uploads proof** (external transfer proof)
2. **FX receiver confirms receipt** (releases locked Naira)
3. **Naira is escrowed** (locked in platform)
4. **FX is external** (bank transfer outside platform)

## Authorization Logic

```typescript
// Upload Proof (markAsPaid)
BUY_FX  → Taker uploads
SELL_FX → Maker uploads

// Confirm Receipt (confirmOrder)
BUY_FX  → Maker confirms
SELL_FX → Taker confirms
```

## Common Scenarios

**"I want to sell 200 USD"**
→ You respond to a BUY_FX ad
→ You are the Taker
→ You send USD → You upload proof ✓

**"I want to buy 200 USD"**
→ You respond to a SELL_FX ad
→ You are the Taker
→ You lock Naira → You confirm receipt ✓

**"I created a BUY_FX ad for 200 USD"**
→ You are the Maker
→ You lock Naira → You confirm receipt ✓

**"I created a SELL_FX ad for 200 USD"**
→ You are the Maker
→ You send USD → You upload proof ✓
