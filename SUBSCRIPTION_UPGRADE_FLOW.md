# Subscription Upgrade Flow Documentation

## Overview
This document describes the subscription upgrade process, including refund handling and known issues.

## Upgrade Flow

### When a user upgrades their subscription:

1. **Check for existing subscription** in Stripe (customer must have active subscription to upgrade)
2. **Calculate prorated refund** for unused time on old plan:
   ```
   Refund = (Old Plan Price) × (Days Remaining / Total Days in Period)
   ```
3. **Cancel old subscription** in Stripe
4. **Issue refund** to customer's payment method for prorated amount
   - Using Stripe Refunds API (actual refund to card)
   - NOT credit memos (which only create account credits)
5. **Create new subscription** for the new plan at full price
6. **Update Supabase** with new subscription details for dashboard

### Example:
- Old plan: Starter Annual ($120/year) - Paid on June 10, 2026
- Remaining days: 365 (full year)
- Days remaining: 355
- Prorated refund: $120 × (355/365) = ~$116.44
- New plan: Growth Annual ($240/year)
- **Customer's net cost**: $240 - $116.44 = ~$123.56 additional charge

## Important: Refunds vs Credit Memos

### ❌ WRONG: Credit Memos
- Create account credit only
- Don't refund to customer's card
- Customer sees two charges in billing history
- App shows credit but customer doesn't see refund in bank

### ✅ CORRECT: Stripe Refunds API
- Refund money directly to payment method
- Shows as refund in customer's bank account
- Clean billing: one charge (net amount after refund)
- Customer sees: -$116 refund + $240 charge = $124 net

## Code Location
- **Upgrade logic**: `/lib/stripe-utils.ts` → `upgradeSubscriptionViaCancel()`
- **Checkout handler**: `/app/api/billing/checkout/route.ts`
- **Refund implementation**: Lines 261-282 (upgradeSubscriptionViaCancel) and Lines 364-386 (updateSubscriptionWithProration)

## Known Issues & Fixes

### Issue: Double Charge (FIXED in commit 1acf3ba)
**Problem**: Early versions issued credit memos instead of refunds, causing:
- Customer sees two charges in Stripe
- App displays both as "Paid"
- Refund doesn't appear in bank account

**Solution Applied**:
- Changed from `stripe.creditNotes.create()` to `stripe.refunds.create()`
- Refunds now go directly to payment method
- Added metadata to track upgrades: `reason: 'subscription_upgrade'`

### Issue: 500 Error on First Attempt (Partially Fixed)
**Problem**: If Supabase update fails, API returns 500 but Stripe operations already completed
- Subscription already created and charged
- User retries and may create duplicate

**Partial Fix Applied**:
- Improved error logging with detailed console output
- Moved Supabase save into try/catch to prevent hard failure
- TODO: Add idempotency keys to prevent duplicate charges

## Testing Checklist

- [ ] User can upgrade from lower to higher plan
- [ ] Correct prorated refund is calculated
- [ ] Refund appears in bank account (not just account credit)
- [ ] New subscription shows correct plan and amount
- [ ] Dashboard reflects new plan immediately after payment
- [ ] No duplicate charges if user retries after error
- [ ] Billing history shows both old and new charges with dates

## Troubleshooting

### User sees two charges but no refund
- Check Stripe: Look for `Credit Note` - this was the old behavior
- Expected: Should see a `Refund` instead
- Fix: User needs manual refund - contact support

### User can't upgrade
- Check Stripe: Is there an active subscription for this customer?
- Check logs: Look for `[CHECKOUT]` or `[STRIPE-UPGRADE]` messages
- Check Supabase: Does user have a subscription record?

## Future Improvements

1. **Idempotency Keys**: Add idempotency keys to all Stripe API calls
2. **Webhook Verification**: Verify upgrade success via webhooks before redirecting
3. **Transaction Logging**: Log all Stripe operations to DB for audit trail
4. **Dry Run**: Show user exact refund amount before processing
5. **Partial Failures**: Handle cases where cancel succeeds but refund fails
