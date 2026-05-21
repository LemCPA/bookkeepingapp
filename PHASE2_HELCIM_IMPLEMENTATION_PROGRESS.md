# Phase 2: Helcim Billing Implementation - Progress Update

## Completed Work (May 21, 2026)

### Step 2: Database Schema Updates ✅
- Updated `.data/bookkeeping.json` with new billing tables:
  - `subscriptions` - Track user subscriptions and plans
  - `billing_history` - Invoice and payment records
  - `payment_methods` - Saved payment methods
  - `helcim_webhooks` - Processed webhook events
- Updated users table to include `plan` and `helcim_customer_id` fields
- Added all required ID counters for new tables

### Step 3: Core Database Functions ✅
- **lib/db.ts** - Added new helper functions:
  - Subscription management: `createSubscription()`, `getSubscription()`, `updateSubscription()`
  - Billing history: `createBillingEntry()`, `getBillingHistory()`, `getBillingEntry()`, `updateBillingEntry()`
  - Payment methods: `createPaymentMethod()`, `getPaymentMethods()`, `getDefaultPaymentMethod()`, `deletePaymentMethod()`
  - Webhook handling: `createWebhookEvent()`, `getWebhookEvent()`, `markWebhookProcessed()`, `getUnprocessedWebhooks()`

### Step 4: Billing Utilities ✅
- **lib/billing-utils.ts** - Complete billing logic library:
  - Plan configuration: Starter ($9/mo), Professional ($29/mo), Enterprise ($99/mo)
  - Trial management: 14-day free trial functions
  - Subscription status tracking
  - Client limit validation per plan
  - Price formatting and display
  - Proration calculations for upgrades/downgrades

### Step 5: Helcim API Integration ✅
- **lib/helcim-utils.ts** - Helcim payment processor integration:
  - Customer creation and management
  - Subscription creation, updates, and cancellation
  - Payment method handling
  - Payment intent creation
  - Invoice retrieval and PDF downloads
  - Webhook signature verification
  - Webhook event parsing and routing
  - Connection testing utility

### Step 6: API Routes (Phase 2.1) ✅
Created complete billing API endpoints:

1. **POST /api/billing/create-subscription**
   - Creates new Helcim customer if needed
   - Creates subscription with 14-day free trial
   - Stores subscription in database
   - Returns subscription details

2. **GET /api/billing/subscription**
   - Returns current subscription status
   - Includes plan details and features
   - Shows trial/expiration information
   - Defaults to free plan if no subscription

3. **GET/POST/DELETE /api/billing/payment-methods**
   - GET: Lists saved payment methods for user
   - POST: Adds new payment method to Helcim
   - DELETE: Removes payment method

4. **POST /api/billing/cancel-subscription**
   - Cancels active subscription
   - Updates status to "canceled"
   - Records cancellation date
   - Optional cancellation reason

5. **GET /api/billing/invoices**
   - Lists billing history with pagination
   - Returns invoice details and amounts
   - Provides download URLs for PDF receipts
   - Supports PDF download via `?download=true&id=invoiceId`

6. **POST /api/billing/webhooks/helcim**
   - Receives Helcim webhook events
   - Verifies webhook signature (HMAC-SHA256)
   - Handles events:
     - `payment.success` → Updates subscription to active
     - `payment.failed` → Updates subscription to past_due
     - `subscription.created` → Logs creation
     - `subscription.updated` → Syncs status
     - `subscription.canceled` → Updates status
     - `invoice.created` → Creates billing history entry
   - Prevents duplicate processing
   - Returns idempotent responses

### Step 7: Environment Configuration ✅
- Updated `.env.local` with Helcim credentials placeholders:
  - `HELCIM_API_TOKEN` - For API authentication
  - `HELCIM_APP_ID` - Application identifier
  - `HELCIM_WEBHOOK_SECRET` - For webhook signature verification

## Architecture Overview

### Subscription Flow
1. User selects plan on pricing page
2. POST to `/api/billing/create-subscription` with `planId`
3. System creates Helcim customer (if first subscription)
4. System creates 14-day trial subscription in Helcim
5. Subscription stored in database with trial_end_date
6. User has free access during trial period

### Payment Flow
1. Trial ends → Helcim sends `invoice.created` webhook
2. Invoice created → Helcim sends `payment.success` webhook
3. Webhook → System updates subscription status to "active"
4. User gets full access to plan features
5. Payment failed → `payment.failed` webhook → Status to "past_due"

### Webhook Security
- All webhooks signed with HMAC-SHA256
- Signature verification before processing
- Idempotent event processing (no duplicates)
- Webhook records stored for audit trail

## Plan Tiers & Features

**Free Plan**
- $0/month
- 5 client accounts max
- Basic transaction tracking
- Monthly reports

**Starter Plan**
- $9/month (900 cents)
- 5 client accounts max
- Transaction categorization
- Monthly/annual reports
- Basic bank reconciliation
- GST/HST calculation

**Professional Plan**
- $29/month (2900 cents)
- Unlimited clients
- Advanced transaction management
- Multi-month reporting
- Full bank reconciliation
- GST/HST and tax filing support
- Advanced analytics
- Audit trails

**Enterprise Plan**
- $99/month (9900 cents)
- Unlimited clients
- All Professional features
- Custom integrations
- Priority support
- Custom reporting
- Dedicated account management

## Next Steps (Blocking: User Action Required)

### 1. Helcim Account Setup ⏳
**USER MUST DO THIS:**
- [ ] Visit https://www.helcim.com
- [ ] Sign up for account (ensure it's production account, not sandbox)
- [ ] Verify email
- [ ] Complete identity verification (business registration)
- [ ] Add bank account for payouts

### 2. Get Helcim API Credentials ⏳
**USER MUST RETRIEVE THESE:**
- [ ] Log into Helcim dashboard
- [ ] Navigate to API Settings (usually Settings > API Keys)
- [ ] Copy `HELCIM_API_TOKEN`
- [ ] Copy `HELCIM_APP_ID`
- [ ] Generate `HELCIM_WEBHOOK_SECRET`

### 3. Configure Environment Variables ⏳
**USER MUST COMPLETE:**
- Update `.env.local` with actual credentials:
  ```env
  HELCIM_API_TOKEN=<actual_token>
  HELCIM_APP_ID=<actual_app_id>
  HELCIM_WEBHOOK_SECRET=<actual_secret>
  ```

### 4. Set Up Webhook URL in Helcim 📝
Once deployed or exposed to internet:
- [ ] In Helcim dashboard, add webhook URL:
  - `https://your-app-domain.com/api/billing/webhooks/helcim`
  - Enable events: payment.success, payment.failed, subscription.*
  - Webhook will receive signed events

### 5. Test Helcim Connection 🧪
- [ ] Verify credentials with test endpoint
- [ ] Test subscription creation with trial
- [ ] Verify webhook signature verification works

### 6. Frontend Implementation (Next Phase)
- [ ] Create `/app/billing/page.tsx` (billing dashboard)
- [ ] Create `/app/billing/payment-method/page.tsx` (manage cards)
- [ ] Create `/app/billing/invoices/page.tsx` (invoice history)
- [ ] Create `/app/billing/cancel/page.tsx` (cancellation flow)
- [ ] Update `/app/pricing/page.tsx` (add subscribe buttons)

### 7. Email Notifications (Next Phase)
- [ ] Trial ending soon (3 days before)
- [ ] Payment successful
- [ ] Payment failed (with retry instructions)
- [ ] Subscription upgraded
- [ ] Subscription canceled
- [ ] Invoice ready (with PDF link)

## Files Created/Modified

### New Files
```
lib/
  ├── billing-utils.ts (new)
  └── helcim-utils.ts (new)

app/api/billing/
  ├── create-subscription/route.ts (new)
  ├── payment-methods/route.ts (new)
  ├── subscription/route.ts (new)
  ├── cancel-subscription/route.ts (new)
  ├── invoices/route.ts (new)
  └── webhooks/
      └── helcim/route.ts (new)

PHASE2_HELCIM_IMPLEMENTATION_PROGRESS.md (new)
```

### Modified Files
```
.data/bookkeeping.json
  - Added subscriptions, billing_history, payment_methods, helcim_webhooks tables
  - Updated users table schema with plan and helcim_customer_id

lib/db.ts
  - Updated DbData interface with new billing tables
  - Added backward compatibility checks in getDb()
  - Updated initializeDb() with new tables
  - Added 25+ new database functions for billing operations

.env.local
  - Added HELCIM_API_TOKEN, HELCIM_APP_ID, HELCIM_WEBHOOK_SECRET
  - Marked QBO variables as NOT USED
```

## Testing Checklist

### Before Going Live
- [ ] Helcim credentials configured in .env.local
- [ ] Test subscription creation endpoint
  - [ ] Creates Helcim customer
  - [ ] Creates subscription with trial
  - [ ] Stores in database
  - [ ] Returns correct subscription info
- [ ] Test webhook signature verification
  - [ ] Valid signature → processed
  - [ ] Invalid signature → rejected
- [ ] Test payment flow
  - [ ] Trial subscription created
  - [ ] Days remaining calculated correctly
  - [ ] Status shows "trialing"
- [ ] Test payment method management
  - [ ] Add payment method
  - [ ] List payment methods
  - [ ] Set default
  - [ ] Delete payment method
- [ ] Test cancellation
  - [ ] Cancel subscription
  - [ ] Status updates to "canceled"
  - [ ] Helcim updated
- [ ] Test invoices
  - [ ] Billing history populated from webhooks
  - [ ] PDF download works
  - [ ] Correct amounts shown

## Security Considerations

✅ Implemented:
- Webhook signature verification (HMAC-SHA256)
- User ID verification on all endpoints
- Payment method IDs validated against user
- No sensitive card data stored locally
- All credentials in environment variables

⚠️ To Add:
- Rate limiting on billing endpoints
- HTTPS enforcement in production
- Email verification for payment method changes
- Audit logging for all billing changes
- PCI compliance review

## Estimated Timeline

- **Setup Helcim Account**: 15-30 minutes (user)
- **Get Credentials**: 5 minutes (user)
- **Environment Configuration**: 2 minutes (user)
- **Frontend Implementation**: 3-4 hours (next phase)
- **Email Setup**: 1 hour (next phase)
- **Testing & Debugging**: 2 hours (next phase)

**Total for Phase 2: ~12 hours** (mostly waiting for user to set up Helcim)

## Status

**Currently Blocked On**: User setting up Helcim account and providing API credentials

Once credentials are provided:
1. Test connection with `testHelcimConnection()`
2. Proceed with frontend implementation
3. Set up email notifications
4. Full testing and deployment

---

**Next Action**: User must sign up for Helcim account and retrieve API credentials
