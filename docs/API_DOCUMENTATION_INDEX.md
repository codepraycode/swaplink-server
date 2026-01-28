# 📚 API Documentation Index

**Last Updated:** 2026-01-28  
**API Version:** v1

---

## 🎯 Quick Start

**New to these changes?** Start here:

1. Read: [`MOBILE_API_CHANGES_SUMMARY.md`](./MOBILE_API_CHANGES_SUMMARY.md) (5 min)
2. Review: [`MOBILE_CHANGELOG.md`](./MOBILE_CHANGELOG.md) (10 min)
3. Implement: [`MOBILE_INTEGRATION_GUIDE.md`](./MOBILE_INTEGRATION_GUIDE.md) (Full guide)

---

## 📱 Mobile Team Documentation

### Essential Reading

| Document                                                           | Purpose                            | Time   | Priority    |
| ------------------------------------------------------------------ | ---------------------------------- | ------ | ----------- |
| [`MOBILE_API_CHANGES_SUMMARY.md`](./MOBILE_API_CHANGES_SUMMARY.md) | Quick overview of breaking changes | 5 min  | 🔴 Critical |
| [`MOBILE_CHANGELOG.md`](./MOBILE_CHANGELOG.md)                     | Visual before/after comparisons    | 10 min | 🔴 Critical |
| [`MOBILE_INTEGRATION_GUIDE.md`](./MOBILE_INTEGRATION_GUIDE.md)     | Complete implementation guide      | 30 min | 🔴 Critical |

### Reference Guides

| Document                                                                   | Purpose                | When to Use                  |
| -------------------------------------------------------------------------- | ---------------------- | ---------------------------- |
| [`P2P_PAYMENT_METHODS.md`](./P2P_PAYMENT_METHODS.md)                       | Payment method details | Implementing payment forms   |
| [`PROFILE_UPDATE_RESTRICTIONS.md`](./PROFILE_UPDATE_RESTRICTIONS.md)       | Profile update details | Implementing profile screens |
| [`PROFILE_UPDATE_QUICK_REFERENCE.md`](./PROFILE_UPDATE_QUICK_REFERENCE.md) | Quick API reference    | During development           |

---

## 🔧 Backend Team Documentation

### Implementation Details

| Document                                                                 | Purpose                |
| ------------------------------------------------------------------------ | ---------------------- |
| [`PAYMENT_METHOD_UPDATE_SUMMARY.md`](./PAYMENT_METHOD_UPDATE_SUMMARY.md) | Payment method changes |
| [`PROFILE_UPDATE_SUMMARY.md`](./PROFILE_UPDATE_SUMMARY.md)               | Profile update changes |

---

## 📋 Changes Overview

### 1. Payment Methods (P2P)

**Status:** 🔴 Breaking Changes  
**Impact:** High  
**Deadline:** Before next release

**What Changed:**

- CAD → Interac (email-based)
- USD → Zelle (email-based)
- GBP → Simple bank transfer (account number)
- EUR → Removed

**Mobile Action:**

- Update payment method forms
- Add email fields for CAD/USD
- Remove complex banking fields
- Update validation logic

**Documentation:**

- Quick Start: [`MOBILE_API_CHANGES_SUMMARY.md`](./MOBILE_API_CHANGES_SUMMARY.md#1-payment-methods)
- Full Guide: [`MOBILE_INTEGRATION_GUIDE.md`](./MOBILE_INTEGRATION_GUIDE.md#1-payment-methods-p2p)
- API Details: [`P2P_PAYMENT_METHODS.md`](./P2P_PAYMENT_METHODS.md)

---

### 2. Profile Updates

**Status:** 🔴 Breaking Changes  
**Impact:** High  
**Deadline:** Before next release

**What Changed:**

- Name changes blocked (firstName, lastName)
- Address updates require proof of address document
- New endpoint: `PUT /api/v1/user/profile/address`

**Mobile Action:**

- Remove name edit fields
- Create address update screen
- Add file upload for proof of address
- Install expo-document-picker

**Documentation:**

- Quick Start: [`MOBILE_API_CHANGES_SUMMARY.md`](./MOBILE_API_CHANGES_SUMMARY.md#2-profile-updates)
- Full Guide: [`MOBILE_INTEGRATION_GUIDE.md`](./MOBILE_INTEGRATION_GUIDE.md#2-profile-updates--address-verification)
- API Details: [`PROFILE_UPDATE_RESTRICTIONS.md`](./PROFILE_UPDATE_RESTRICTIONS.md)

---

## 🚀 Implementation Roadmap

### Phase 1: Understanding (Day 1)

- [ ] Read `MOBILE_API_CHANGES_SUMMARY.md`
- [ ] Review `MOBILE_CHANGELOG.md`
- [ ] Understand breaking changes
- [ ] Plan implementation approach

### Phase 2: Setup (Day 1)

- [ ] Install `expo-document-picker`
- [ ] Update dependencies
- [ ] Set up development environment
- [ ] Review code examples

### Phase 3: Payment Methods (Day 2-3)

- [ ] Update payment method form UI
- [ ] Add currency-specific fields
- [ ] Update validation logic
- [ ] Update API service calls
- [ ] Test all currencies
- [ ] Handle errors

### Phase 4: Profile Updates (Day 3-4)

- [ ] Remove name edit fields
- [ ] Create address update screen
- [ ] Implement file upload
- [ ] Update validation logic
- [ ] Update API service calls
- [ ] Test address update flow
- [ ] Handle errors

### Phase 5: Testing (Day 5)

- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Error handling tests
- [ ] Edge cases

### Phase 6: Deployment (Day 6)

- [ ] Code review
- [ ] QA testing
- [ ] Staging deployment
- [ ] Production deployment
- [ ] Monitor for issues

---

## 📖 Documentation Structure

```
docs/
├── MOBILE_API_CHANGES_SUMMARY.md      ← Start here (5 min read)
├── MOBILE_CHANGELOG.md                ← Visual guide (10 min read)
├── MOBILE_INTEGRATION_GUIDE.md        ← Full implementation (30 min read)
│
├── P2P_PAYMENT_METHODS.md             ← Payment method details
├── PAYMENT_METHOD_UPDATE_SUMMARY.md   ← Backend changes
│
├── PROFILE_UPDATE_RESTRICTIONS.md     ← Profile update details
├── PROFILE_UPDATE_SUMMARY.md          ← Backend changes
├── PROFILE_UPDATE_QUICK_REFERENCE.md  ← Quick API reference
│
└── API_DOCUMENTATION_INDEX.md         ← This file
```

---

## 🎓 Learning Path

### For Mobile Developers (New to Project)

1. **Day 1: Understanding**
    - Read: `MOBILE_API_CHANGES_SUMMARY.md`
    - Read: `MOBILE_CHANGELOG.md`
    - Review: Code examples in `MOBILE_INTEGRATION_GUIDE.md`

2. **Day 2-3: Payment Methods**
    - Study: Payment Methods section in integration guide
    - Reference: `P2P_PAYMENT_METHODS.md`
    - Implement: Payment method forms
    - Test: All three currencies

3. **Day 4-5: Profile Updates**
    - Study: Profile Updates section in integration guide
    - Reference: `PROFILE_UPDATE_RESTRICTIONS.md`
    - Implement: Address update screen
    - Test: File upload flow

4. **Day 6: Polish & Deploy**
    - Review: Error handling
    - Test: Edge cases
    - Deploy: To staging
    - Monitor: For issues

---

## 🔍 Quick Reference

### API Endpoints

#### Payment Methods

```
POST   /api/v1/p2p/payment-methods        Create payment method
GET    /api/v1/p2p/payment-methods        Get all payment methods
DELETE /api/v1/p2p/payment-methods/:id    Delete payment method
```

#### Profile

```
PUT    /api/v1/user/profile               Update profile (restricted)
PUT    /api/v1/user/profile/address       Update address (new)
POST   /api/v1/user/profile/avatar        Update avatar
POST   /api/v1/user/change-password       Change password
```

### Request Formats

#### CAD Payment Method

```json
{
    "currency": "CAD",
    "accountName": "John Doe",
    "email": "john@example.com"
}
```

#### USD Payment Method

```json
{
    "currency": "USD",
    "accountName": "Jane Smith",
    "email": "jane@example.com"
}
```

#### GBP Payment Method

```json
{
    "currency": "GBP",
    "bankName": "Barclays",
    "accountName": "Robert Johnson",
    "accountNumber": "12345678"
}
```

#### Address Update

```
FormData {
  address: "123 Main Street",
  city: "Lagos",
  proofOfAddress: [FILE]
}
```

---

## ❓ FAQ

### Payment Methods

**Q: Why did we change from routing numbers to email?**  
A: Modern payment systems like Interac and Zelle use email for faster, simpler transfers.

**Q: What about existing payment methods?**  
A: They continue to work. Only new payment methods use the new format.

**Q: Can users have multiple payment methods?**  
A: Yes, one per currency. One can be marked as primary.

### Profile Updates

**Q: Why can't users change their names?**  
A: Security and KYC compliance. Name changes require manual verification.

**Q: What documents are accepted for proof of address?**  
A: Utility bills, bank statements, or government documents showing name and address.

**Q: How long does address review take?**  
A: Typically 24-48 hours. Users are notified when approved/rejected.

**Q: What if proof of address is rejected?**  
A: Users can upload a new document with corrections.

---

## 🆘 Support

### For Mobile Team

**Questions about implementation?**

- Check: Full integration guide
- Review: Code examples
- Contact: Backend team

**Found a bug?**

- Check: Error messages
- Review: Validation logic
- Report: With screenshots and logs

**Need clarification?**

- Check: FAQ section
- Review: API details
- Ask: In team chat

### For Backend Team

**API questions?**

- Check: Backend summary docs
- Review: Service implementations
- Check: Database schema

---

## 📊 Metrics & Monitoring

### Key Metrics to Track

**Payment Methods:**

- Creation success rate
- Validation error rate
- Currency distribution
- Primary method usage

**Profile Updates:**

- Address update requests
- Document upload success rate
- Review approval rate
- Average review time

### Alerts to Set

- High validation error rate (> 10%)
- File upload failures (> 5%)
- Document rejection rate (> 30%)
- Slow review times (> 48 hours)

---

## 🔄 Version History

| Version | Date       | Changes                                                  |
| ------- | ---------- | -------------------------------------------------------- |
| 1.0.0   | 2026-01-28 | Initial release with payment methods and profile updates |

---

## 📞 Contact

**Backend Team:** [Contact Info]  
**Mobile Team Lead:** [Contact Info]  
**Project Manager:** [Contact Info]

---

**Last Updated:** 2026-01-28  
**Next Review:** After mobile app deployment
