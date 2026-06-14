# Bookkeeping App - Project Instructions

## Critical Architecture Rule

**ALL persistent data goes to Supabase PostgreSQL. NO local file storage.**

Vercel has a read-only filesystem. Any code that tries to write to `/var/task/.data/bookkeeping.json` will fail with `EROFS: read-only file system`.

---

## Data Storage Rules

### ❌ NEVER DO THIS

- `saveDb(db)` - **Do not call this on Vercel**
- `writeFileSync()` - **Do not write to local files**
- Storing user data in JSON files
- Storing subscriptions locally
- Any file I/O operations expecting persistence

### ✅ DO THIS INSTEAD

**User Accounts:** Local memory + sync to Supabase (for recovery)
- Created in local database during signup (ephemeral)
- Synced to Supabase in `syncUserToSupabase()`
- Fetched from Supabase in `getUserFromSupabase()`

**Subscriptions:** Supabase ONLY
- Saved in `saveSubscriptionToSupabase()`
- Retrieved with `getSubscriptionFromSupabase()`
- Updated by Stripe webhooks

**Stripe Data:** Supabase + Stripe API
- Customer ID: `stripe_customer_id` in Supabase `users` table
- Subscription: `subscriptions` table in Supabase
- Webhooks process events from Stripe → save to Supabase

**Trial Dates:** Supabase only
- `user.created_at` in `users` table
- Calculated in `getDaysRemainingInTrial(createdAt)` on frontend

---

## Key Database Tables

### `users` (Supabase)
```sql
-- UUID ID (converted from numeric via numericIdToUuid)
id: UUID
email: string
name: string
stripe_customer_id: string (nullable)
created_at: timestamp
```

**Important:** The `users` table in Supabase uses UUID IDs. When querying:
```typescript
const userUuid = numericIdToUuid(userId)  // Convert numeric to UUID FIRST
const user = await getUserFromSupabase(userId)  // This does the conversion
```

### `subscriptions` (Supabase)
```sql
user_id: UUID          -- Foreign key to users.id
stripe_customer_id: string
stripe_subscription_id: string
plan: string           -- 'starter', 'starter_annual', 'growth', 'growth_annual'
status: string         -- 'active', 'cancelled', 'grace_period'
trial_end_date: timestamp (nullable)
current_period_start: timestamp
current_period_end: timestamp
created_at: timestamp
```

---

## Request Flow

### Signup
1. User creates account → stored in local database
2. `syncUserToSupabase(userId, email, name)` → syncs to Supabase
3. `createStripeCustomer(email, name)` → creates Stripe customer
4. `updateUserStripeCustomerId(userId, customerId)` → saves customer ID to Supabase

### Checkout
1. `getUserFromSupabase(userId)` → fetch user from Supabase (NOT local db)
2. `syncUserToSupabase(...)` → ensure user is in Supabase
3. `createStripeCustomer()` if no stripe_customer_id
4. `updateUserStripeCustomerId()` → save customer ID
5. `createCheckoutSession()` → Stripe session created
6. Webhook processes payment → `saveSubscriptionToSupabase()`

### Stripe Webhook
1. **CRITICAL:** Look up user by `stripe_customer_id` ONLY
2. Do NOT look up by email (causes subscriptions to save to wrong account)
3. Save subscription to `subscriptions` table
4. Update user status based on subscription plan

---

## Common Mistakes (DO NOT REPEAT)

### ❌ Mistake 1: Calling `saveDb()` on Vercel
```typescript
// WRONG - This will fail on Vercel
db.users.push(newUser)
saveDb(db)  // ERROR: read-only filesystem
```

**Fix:** Don't call `saveDb()` on Vercel. Check `process.env.VERCEL` first:
```typescript
if (!process.env.VERCEL) {
  saveDb(db)  // Only save locally in development
}
```

### ❌ Mistake 2: Hardcoding Stripe Price IDs
```typescript
// WRONG - Old price IDs won't match new ones
const STARTER_PRICE = 'price_1TfK0i...'  // Outdated
```

**Fix:** Load from environment variables:
```typescript
const STARTER_PRICE = process.env.STRIPE_STARTER_PRICE_ID
const GROWTH_PRICE = process.env.STRIPE_GROWTH_PRICE_ID
const STARTER_ANNUAL_PRICE = process.env.STRIPE_STARTER_ANNUAL_PRICE_ID
const GROWTH_ANNUAL_PRICE = process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID
```

### ❌ Mistake 3: Email-based user lookup in webhook
```typescript
// WRONG - Finds old account when user reuses email
const user = await findUserByEmail(stripeCustomer.email)
```

**Fix:** Use `stripe_customer_id` ONLY:
```typescript
let user = await findUserByStripeCustomerId(stripeCustomerId)
if (!user) {
  // Don't fall back to email - it finds the WRONG account
  console.error('User not found by stripe_customer_id')
  return  // Fail safely
}
```

### ❌ Mistake 4: UUID/Numeric ID mismatch
```typescript
// WRONG - Supabase uses UUID, not numeric
const user = await supabase.from('users').select().eq('id', 5)  // Won't find anything
```

**Fix:** Convert numeric to UUID first:
```typescript
const userUuid = numericIdToUuid(5)  // Convert to UUID
const user = await supabase.from('users').select().eq('id', userUuid)  // Now it works
```

### ❌ Mistake 5: Using local database email for Stripe operations
```typescript
// WRONG - Local database email can be outdated/stale
let user = getUser(userId)  // Gets user from LOCAL database
createStripeCustomer(user.email, user.name)  // Uses stale email!
// Result: Stripe customer created with OLD email, subscription saves to WRONG account
```

**Fix:** Always use Supabase email for Stripe:
```typescript
// 1. Get user from local database (for id, name)
let localUser = getUser(userId)

// 2. Sync to Supabase to ensure latest data
await syncUserToSupabase(localUser.id, localUser.email, localUser.name)

// 3. FETCH USER FROM SUPABASE - this is source of truth
let supabaseUser = await getUserFromSupabase(localUser.id)

// 4. Use Supabase email for Stripe (NEVER local database email)
const userEmail = supabaseUser.email  // ✅ Use Supabase email
createStripeCustomer(userEmail, localUser.name)
```

**Why:** Local database can have stale data. Supabase is the single source of truth for subscription-related data.

---

## Environment Variables Required

### `.env` (Backend/Vercel)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_SECRET=...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (from Stripe dashboard)
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_STARTER_ANNUAL_PRICE_ID=price_...
STRIPE_GROWTH_PRICE_ID=price_...
STRIPE_GROWTH_ANNUAL_PRICE_ID=price_...

# Stripe Prices in cents (loaded into PRICING_PLANS)
STRIPE_STARTER_PRICE=1200           # $12/month
STRIPE_STARTER_ANNUAL_PRICE=13200   # $132/year ($11/month)
STRIPE_GROWTH_PRICE=2300            # $23/month
STRIPE_GROWTH_ANNUAL_PRICE=25200    # $252/year ($21/month)

# Stripe Plan Features
STRIPE_STARTER_UPLOADS=30           # Monthly uploads for Starter plan
STRIPE_GROWTH_UPLOADS=200           # Monthly uploads for Growth plan

# Business Rules
TRIAL_DURATION_DAYS=14              # Free trial period for new accounts
DEFAULT_PAYMENT_TERMS_DAYS=30       # Default due date for invoices

# Claude API
CLAUDE_API_KEY=sk-ant-...

# SendGrid (optional)
SENDGRID_API_KEY=SG....
```

**Important:** `.env.local` should NOT be committed. Delete it to prevent local values from overriding Vercel dashboard values.

---

## Pricing & Configuration

**Subscription Plans:** Free, Starter, Growth (only)

### Price Management

Prices are **NOT hardcoded** in the code. All pricing and plan configuration is loaded from environment variables:

**Plan Pricing (in cents):**
- `STRIPE_STARTER_PRICE=1200` → Starter monthly: $12/month
- `STRIPE_STARTER_ANNUAL_PRICE=13200` → Starter annual: $132/year
- `STRIPE_GROWTH_PRICE=2300` → Growth monthly: $23/month
- `STRIPE_GROWTH_ANNUAL_PRICE=25200` → Growth annual: $252/year

**Plan Features:**
- `STRIPE_STARTER_UPLOADS=30` → Monthly uploads for Starter
- `STRIPE_GROWTH_UPLOADS=200` → Monthly uploads for Growth

**Business Rules:**
- `TRIAL_DURATION_DAYS=14` → Free trial period (in days)
- `DEFAULT_PAYMENT_TERMS_DAYS=30` → Invoice due date (in days)

### Why Environment Variables?

These values are **business decisions**, not code decisions. They can change:
- **Prices** change seasonally or strategically
- **Upload limits** may be adjusted for different markets
- **Trial duration** may be extended for promotions
- **Payment terms** may vary by customer or region

To update any configuration:
1. Update the environment variable (in `.env` for local dev, in Vercel dashboard for production)
2. Restart the dev server
3. Changes take effect immediately (no code redeploy needed)

**Rule:** If a non-developer (ops, product, finance) might change it, it must be configurable. Do NOT hardcode business rules in code.

### Configuration Decision Matrix

**Move to environment variables (configurable):**
- ✅ Prices, fees, costs
- ✅ Limits (uploads, storage, users, clients)
- ✅ Trial periods, payment terms, billing cycles
- ✅ Feature flags or toggles
- ✅ API rate limits, timeouts
- ✅ Email templates or contact information
- ✅ Geographic or market-specific rules

**Keep in code (not configurable):**
- ❌ Algorithm logic (calculation methods, business logic)
- ❌ System constants (max retry attempts = 3)
- ❌ Technical implementation details
- ❌ Error messages or user-facing copy (unless used in multiple places)

**Test before deploying env var changes:**
- [ ] Updated `.env` locally and verified the value loads correctly
- [ ] Restarted dev server (env vars load once at startup)
- [ ] Tested the feature that uses this value end-to-end
- [ ] Documented the change (what changed, why) for future reference

---

## Testing Checklist

Before deploying changes:

- [ ] No new `saveDb()` calls added
- [ ] No hardcoded price IDs
- [ ] No hardcoded trial duration
- [ ] Webhook uses `stripe_customer_id` lookup, not email
- [ ] All UUID conversions use `numericIdToUuid()`
- [ ] All Supabase queries use converted UUIDs, not numeric IDs
- [ ] Test signup → create user in Supabase
- [ ] Test checkout → subscription saved to correct account
- [ ] Test webhook → subscription status updates correctly

---

## Emergency Fixes

If you see `EROFS: read-only file system` error:

1. Check which function is calling `saveDb()`
2. Add `if (!process.env.VERCEL) { saveDb(db) }`
3. Or remove the `saveDb()` call entirely if data is ephemeral
4. Push fix to GitHub → Vercel auto-redeploys

If subscription saves to wrong account:

1. Check webhook email fallback lookup (REMOVE IT)
2. Ensure `stripe_customer_id` is being saved in checkout
3. Verify Supabase `users` table has the customer ID
4. Check Vercel logs for webhook errors

---

**Last Updated:** 2026-06-09  
**Critical Rules:** Never use local file I/O on Vercel. Always use Supabase for persistent data.
