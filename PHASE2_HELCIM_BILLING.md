# Phase 2: Helcim Customer Billing - Implementation Plan

## Overview

Transform the app into a subscription-based SaaS with Helcim payment processing.

**Pricing Tiers:**
- Starter: $9/month (5 clients max)
- Professional: $29/month (unlimited clients)
- Enterprise: $99/month (custom features)

---

## Step 1: Setup (Before Coding)

### 1.1 Create Helcim Account
- [ ] Sign up: https://www.helcim.com
- [ ] Get API credentials:
  - `HELCIM_API_TOKEN` (authentication)
  - `HELCIM_APP_ID` (application ID)
  - `HELCIM_WEBHOOK_SECRET` (for webhooks)

### 1.2 Add to .env.local
```env
# Helcim Payment Processing
HELCIM_API_TOKEN=your_api_token
HELCIM_APP_ID=your_app_id
HELCIM_WEBHOOK_SECRET=your_webhook_secret

# Subscription Plans
PLAN_STARTER_PRICE=900  # $9.00 in cents
PLAN_PROFESSIONAL_PRICE=2900  # $29.00 in cents
PLAN_ENTERPRISE_PRICE=9900  # $99.00 in cents
```

### 1.3 Install Helcim SDK
```bash
npm install helcim
```

---

## Step 2: Database Schema Updates

### Add Billing Tables to `.data/bookkeeping.json`

```javascript
subscriptions: [
  {
    id: 1,
    user_id: 1,
    plan: "professional",  // starter | professional | enterprise
    status: "active",  // active | trialing | past_due | canceled
    helcim_customer_id: "cust_xxx",
    helcim_subscription_id: "sub_xxx",
    trial_end_date: "2026-06-04",  // null if no trial
    current_period_start: "2026-05-18",
    current_period_end: "2026-06-18",
    created_at: "2026-05-18T00:00:00Z",
    canceled_at: null,
    updated_at: "2026-05-18T00:00:00Z"
  }
]

billing_history: [
  {
    id: 1,
    user_id: 1,
    helcim_invoice_id: "inv_xxx",
    amount: 2900,  // in cents
    currency: "CAD",
    status: "paid",  // paid | pending | failed
    period_start: "2026-05-18",
    period_end: "2026-06-18",
    paid_at: "2026-05-18T10:30:00Z",
    created_at: "2026-05-18T00:00:00Z"
  }
]

payment_methods: [
  {
    id: 1,
    user_id: 1,
    helcim_payment_method_id: "pm_xxx",
    last4: "4242",
    brand: "visa",
    exp_month: 12,
    exp_year: 2028,
    is_default: true,
    created_at: "2026-05-18T00:00:00Z"
  }
]

helcim_webhooks: [
  {
    id: 1,
    helcim_event_id: "evt_xxx",
    event_type: "payment.success",  // payment.success | payment.failed | subscription.created | etc.
    processed: true,
    created_at: "2026-05-18T00:00:00Z"
  }
]
```

---

## Step 3: Core Utilities

### 3.1 Create `lib/helcim-utils.ts`
- Customer creation
- Subscription creation
- Payment method management
- Invoice handling
- Webhook signature verification

### 3.2 Create `lib/billing-utils.ts`
- Plan configuration
- Price calculations
- Trial logic
- Subscription status checks

---

## Step 4: API Routes

### 4.1 `/api/billing/create-subscription` (POST)
- Input: `{ planId: "starter" | "professional" | "enterprise" }`
- Creates Helcim customer
- Creates subscription
- Returns redirect URL to payment form
- Stores subscription in database

### 4.2 `/api/billing/payment-methods` (GET/POST/DELETE)
- GET: List user's saved payment methods
- POST: Add new payment method
- DELETE: Remove payment method

### 4.3 `/api/billing/subscription` (GET/PUT)
- GET: Current subscription details
- PUT: Update subscription (change plan)

### 4.4 `/api/billing/cancel-subscription` (POST)
- Cancel current subscription
- Update status to "canceled"

### 4.5 `/api/billing/invoices` (GET)
- List invoice history
- Return downloadable PDFs

### 4.6 `/api/billing/webhooks/helcim` (POST)
- Handle Helcim webhook events:
  - `payment.success` → Update subscription status to "active"
  - `payment.failed` → Update status to "past_due", send email
  - `subscription.created` → Log subscription creation
  - `subscription.canceled` → Update status to "canceled"

---

## Step 5: Frontend Pages

### 5.1 Update `/app/pricing/page.tsx`
- Add "Select Plan" buttons
- Show plan features
- Redirect to signup or checkout

### 5.2 Create `/app/billing/page.tsx` (Dashboard)
- Current plan details
- Next billing date
- Usage stats (for current plan tier)
- "Manage Billing" button

### 5.3 Create `/app/billing/payment-method/page.tsx`
- Update credit card
- Add backup payment method
- Delete payment method

### 5.4 Create `/app/billing/invoices/page.tsx`
- Invoice history table
- Download PDF receipts
- Filter by date/status

### 5.5 Create `/app/billing/upgrade/page.tsx`
- Show upgrade options
- Prorated billing calculation
- Immediate upgrade button

### 5.6 Create `/app/billing/cancel/page.tsx`
- Confirm cancellation
- Show reason options
- Offer downgrade to free plan instead

---

## Step 6: Free Tier & Trial Logic

### 6.1 Free Plan Users
- Demo users default to free tier
- Cannot create more than 5 clients
- Can upgrade anytime

### 6.2 14-Day Trial
- New signups get 14-day trial
- No card required for trial
- Email reminder before trial ends
- Auto-convert to starter plan (charged)

---

## Step 7: Email Notifications

### Emails Needed:
1. Trial ending soon (3 days before)
2. Payment successful
3. Payment failed (retry instructions)
4. Subscription upgraded
5. Subscription canceled
6. Invoice ready (with PDF link)

---

## Step 8: Security

### Key Requirements:
- ✅ No credit card data stored locally (Helcim handles this)
- ✅ Webhook signature verification
- ✅ HTTPS only for billing routes
- ✅ User can only access their own subscription/invoices
- ✅ Subscription status verified server-side before allowing access

---

## Implementation Order

### Week 1:
1. Setup Helcim account + credentials ✅
2. Add database tables (subscriptions, billing_history, etc.)
3. Create `lib/helcim-utils.ts`
4. Create `lib/billing-utils.ts`

### Week 2:
5. Create API routes (create-subscription, payment-methods, subscription)
6. Create Helcim webhook handler
7. Update pricing page with checkout buttons

### Week 3:
8. Create billing dashboard pages
9. Add email notifications
10. Testing & bug fixes

### Week 4:
11. Deploy to production
12. Monitor Helcim webhooks
13. Handle edge cases

---

## Testing Checklist

- [ ] Create subscription with Helcim
- [ ] Successful payment charges card
- [ ] Failed payment triggers webhook
- [ ] User can view invoices
- [ ] User can upgrade/downgrade
- [ ] User can cancel subscription
- [ ] Payment method updates work
- [ ] Trial logic works (14 days)
- [ ] Webhook signatures validate correctly
- [ ] Access control works (users see only their data)

---

## Files to Create

```
lib/
  ├── helcim-utils.ts (new)
  ├── billing-utils.ts (new)

app/
  ├── billing/ (new directory)
  │   ├── page.tsx (dashboard)
  │   ├── payment-method/page.tsx
  │   ├── invoices/page.tsx
  │   └── cancel/page.tsx
  ├── api/billing/ (new directory)
  │   ├── create-subscription/route.ts
  │   ├── payment-methods/route.ts
  │   ├── subscription/route.ts
  │   ├── cancel-subscription/route.ts
  │   ├── invoices/route.ts
  │   └── webhooks/
  │       └── helcim/route.ts
```

## Files to Update

- `lib/db.ts` - Add subscription-related functions
- `app/pricing/page.tsx` - Add checkout buttons
- `app/page.tsx` - Show plan info on dashboard
- `.env.local` - Add Helcim credentials

---

## Estimated Effort

- Setup & Database: 2 hours
- API Routes: 4 hours
- Frontend Pages: 3 hours
- Email Notifications: 1 hour
- Testing & Debugging: 2 hours
- **Total: ~12 hours**

---

## Next Action

1. ✅ Sign up for Helcim account
2. ✅ Get API credentials
3. ✅ Add to .env.local
4. Start implementation (Step 2+)

**Ready to begin?**
