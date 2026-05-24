# Email Conversion System - Implementation Guide

## Overview

The email conversion system is a fully automated email sequence designed to convert trial users to paying customers. It requires **zero manual intervention** and runs completely automatically.

## How It Works

### 1. System Architecture

```
User Signup
    ↓
Welcome Email (sent immediately via signup route)
    ↓
User Scans First Receipt
    ↓
Time Saved Email (sent by daily cron job)
    ↓
Day 1: Profit Dashboard Email
    ↓
Day 2: Social Proof Email (case study)
    ↓
Day 3: Scarcity Warning Email
    ↓
Day 5: Tax Readiness Email
    ↓
Day 6: Trial Ending Email
    ↓
Day 7: Final Push Email
    ↓
Day 10 (if unpaid): Last Chance Email
    ↓
Day 30 (if paid): Retention Email
```

### 2. Email Sequence Details

| Email | ID | Trigger | Goal | CTA |
|-------|----|---------|----|-----|
| Welcome | `email_welcome` | User signup | Set expectations, encourage action | "Snap My First Receipt" |
| Time Saved | `email_time_saved` | First receipt scanned | Show 10min → 30sec value | "Snap Another Receipt" |
| Profit Dashboard | `email_profit_dashboard` | Day 1 after signup | Demonstrate financial clarity | "View My Profit Dashboard" |
| Social Proof | `email_social_proof` | Day 2 after signup | Build trust via case study | "Keep Scanning Receipts" |
| Scarcity | `email_scarcity` | Day 3 after signup | Create urgency, warn data loss | "Upgrade to Starter ($9/month)" |
| Tax Readiness | `email_tax_readiness` | Day 5 after signup | Show tax compliance value | "Upgrade Now" |
| Trial Ending | `email_trial_ending` | Day 6 after signup | Present pricing options | "Choose Your Plan" |
| Final Push | `email_final_push` | Day 7 after signup | Last chance messaging | "Upgrade Now - Last Day" |
| Last Chance | `email_last_chance` | Day 10 (unpaid only) | Final warning before deletion | "Upgrade to Keep Data" |
| Retention | `email_retention` | Day 30 (paid only) | Reduce churn with value | "Explore More Features" |

### 3. Integration Points

#### Signup Flow (`/app/api/auth/signup/route.ts`)
- Sends **Welcome Email** immediately when user creates account
- Marks `email_welcome` as sent in `users.emails_sent` array
- Sets `email_verified = true`

#### Transaction Creation (`/app/api/transactions/route.ts`)
- Tracks `first_receipt_scanned_at` timestamp when user creates first transaction
- Increments `receipt_count` for each subsequent transaction
- This data triggers the **Time Saved Email** in the daily cron job

#### Daily Email Sending (`/app/api/email/send-pending/route.ts`)
- Runs daily at **9 AM** (via cron job)
- Fetches all verified users from database
- For each user, determines next email using `getNextEmailForUser()`
- Sends email via SendGrid if not already sent
- Updates `users.emails_sent` array to track sent emails
- Logs statistics (sent count, error count)

## Configuration

### 1. Environment Variables Required

Add these to `.env.local` and production environment:

```env
# SendGrid Email Service
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@bookkeepingapp.ca

# API Security
API_SECRET_KEY=your-secure-random-key-here
CRON_SECRET_KEY=your-cron-secret-key-here

# App URL (for email links)
NEXT_PUBLIC_APP_URL=https://bookkeepingapp.ca
```

### 2. SendGrid Setup

1. Create SendGrid account at https://sendgrid.com
2. Verify sender domain (noreply@bookkeepingapp.ca)
3. Generate API key (Settings → API Keys → Create)
4. Add API key to environment variables

### 3. Database Schema

The system requires these fields in the `users` table:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  first_receipt_scanned_at TIMESTAMP,
  receipt_count INTEGER DEFAULT 0,
  emails_sent TEXT[] DEFAULT '{}', -- Array of email IDs already sent
  last_email_sent_at TIMESTAMP,
  subscription_id VARCHAR(255), -- Stripe subscription ID (null = free trial)
  subscription_status VARCHAR(50), -- 'free', 'starter', 'professional'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- ... other fields
);
```

## API Endpoints

### Send Pending Emails

**Endpoint:** `POST /api/email/send-pending`

**Authentication:**
```
Authorization: Bearer {API_SECRET_KEY}
```

**Response:**
```json
{
  "success": true,
  "sentCount": 45,
  "errorCount": 2,
  "processedUsers": 234,
  "errors": [
    "Failed to send email to invalid@example.com",
    "Failed to send email to another@domain.com"
  ]
}
```

**Manual Trigger:**
```bash
curl -X POST https://bookkeepingapp.ca/api/email/send-pending \
  -H "Authorization: Bearer {API_SECRET_KEY}" \
  -H "Content-Type: application/json"
```

### Monitor Email Status

**Endpoint:** `GET /api/email/send-pending`

**Authentication:**
```
Authorization: Bearer {API_SECRET_KEY}
```

**Response:**
```json
{
  "success": true,
  "emailsSentToday": 142,
  "availableTemplates": 10,
  "lastRun": "2026-05-23T09:00:00.000Z"
}
```

## Automated Execution

### Cron Job Schedule

The system includes a scheduled cron job that runs **every day at 9 AM** (user's local timezone).

**Job:** `send-pending-emails`
**Schedule:** `0 9 * * *` (9 AM daily)
**Command:** Calls `POST /api/email/send-pending`

To view scheduled jobs:
```
CronList (built-in Claude tool)
```

To manually trigger emails:
```
CronCreate - schedule one-time run
OR manually call POST /api/email/send-pending
```

## Testing the System

### 1. Test Signup Email

```bash
# Create a test user
curl -X POST https://bookkeepingapp.ca/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'
```

Check SendGrid dashboard or test email inbox for welcome email.

### 2. Test Receipt Tracking

```bash
# After signup, create a transaction
curl -X POST https://bookkeepingapp.ca/api/transactions \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": 1,
    "transaction_date": "2026-05-23",
    "amount": 50.00,
    "description": "Test receipt",
    "type": "RECEIPT",
    "gst_hst_rate": 0,
    "gst_hst_amount": 0
  }'
```

Verify `first_receipt_scanned_at` is set in database.

### 3. Test Daily Email Sending

```bash
# Manually trigger daily email send
curl -X POST https://bookkeepingapp.ca/api/email/send-pending \
  -H "Authorization: Bearer {API_SECRET_KEY}" \
  -H "Content-Type: application/json"
```

Check response for sent count and check SendGrid dashboard for outgoing emails.

## Email Template Customization

Email templates are defined in `/lib/email-sequences.ts`:

```typescript
export const emailWelcome: EmailTemplate = {
  id: 'email_welcome',
  name: 'Welcome to Bookkeeping for Self-Employed',
  subject: '👋 Welcome! Your free trial is ready',
  preview: 'Snap a receipt. We\'ll handle the rest.',
  trigger: 'signup',
  content: `... email body ...`,
  cta: {
    text: 'Snap My First Receipt',
    url: '[APP_URL]/receipts/snap'
  }
}
```

### Placeholders

Email content can include placeholders replaced with user data:

- `[FirstName]` - User's first name
- `[email]` - User's email address
- `[receipt_count]` - Number of receipts scanned
- `[receipt_vendor]` - Vendor name from scanned receipt
- `[APP_URL]` - Application base URL
- `[transaction_count]` - Total transactions
- `[total_revenue]` - Total revenue
- `[total_expenses]` - Total expenses
- `[net_profit]` - Net profit calculated
- `[days_used]` - Days user has been active
- `[trial_days_remaining]` - Days left in trial
- `[formatted_trial_end]` - Formatted trial end date
- `[subscription_status]` - Current subscription plan

## Monitoring & Maintenance

### Email Delivery Issues

1. **Check SendGrid Logs:**
   - Dashboard → Mail Send → Activity Feed
   - Check bounce/unsubscribe rates
   - Monitor delivery status

2. **Check Application Logs:**
   - Review `/app/api/email/send-pending` endpoint logs
   - Check for API errors or rate limiting

3. **Manual Retry:**
   - Call `POST /api/email/send-pending` manually
   - Check `errorCount` in response
   - Fix issues and retry

### Database Verification

```sql
-- Check users with pending emails
SELECT id, email, emails_sent, subscription_status, created_at
FROM users
WHERE email_verified = true
ORDER BY created_at DESC;

-- Check email sending history
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN subscription_id IS NOT NULL THEN 1 END) as paid_users,
  COUNT(CASE WHEN emails_sent @> ARRAY['email_welcome'] THEN 1 END) as welcomed,
  COUNT(CASE WHEN emails_sent @> ARRAY['email_scarcity'] THEN 1 END) as reached_scarcity,
  COUNT(CASE WHEN subscription_id IS NOT NULL AND emails_sent @> ARRAY['email_retention'] THEN 1 END) as receiving_retention
FROM users;
```

## Conversion Metrics

Track these metrics to monitor system effectiveness:

1. **Welcome Email Delivery:**
   - % of signups receiving welcome email
   - Expected: 100% (sent immediately)

2. **First Receipt Trigger:**
   - % of users scanning first receipt within 7 days
   - Target: 40%+

3. **Email Open Rates:**
   - SendGrid dashboard tracks opens/clicks
   - Target: 30%+ open rate for promotional emails

4. **Conversion Rate:**
   - Users who upgrade to paid plan after email sequence
   - Metric: (Paid Users / Trial Users) × 100
   - Target: 5-10%

5. **Churn Rate (for paid users):**
   - Retention email should reduce cancellations
   - Monitor subscription cancellations day 30-45

## Troubleshooting

### Welcome Email Not Sending

**Problem:** New users not receiving welcome email

**Check:**
1. SendGrid API key configured correctly
2. User email is valid (no typos)
3. Check application logs for errors
4. Verify SendGrid API is accessible

**Fix:**
```typescript
// In signup route, enable error logging
console.log('Sending welcome email to:', email)
console.log('SendGrid API key available:', !!process.env.SENDGRID_API_KEY)
```

### Daily Emails Not Sending

**Problem:** Cron job running but no emails sent

**Check:**
1. Cron job is scheduled (verify with CronList)
2. API_SECRET_KEY is set in environment
3. Check application logs at 9 AM daily
4. Verify users have `email_verified = true`

**Fix:**
```bash
# Manually check what emails would be sent
SELECT 
  id, email, created_at, 
  (NOW() - created_at)::numeric / 86400 as days_since_signup,
  emails_sent, subscription_id
FROM users
WHERE email_verified = true
LIMIT 10;
```

### Email Links Not Working

**Problem:** Users click email links but get 404 errors

**Check:**
1. `NEXT_PUBLIC_APP_URL` environment variable is set correctly
2. App URL in email matches production domain
3. Links use correct paths (e.g., `/receipts/snap` not `/app/receipts/snap`)

**Fix:**
```env
NEXT_PUBLIC_APP_URL=https://bookkeepingapp.ca
```

## Performance Considerations

- **Batch Sending:** Daily cron processes all users in one batch
- **Rate Limiting:** SendGrid allows 300 emails/second (plenty for daily batches)
- **Database Queries:** Single query fetches all users, single update per email sent
- **Expected Processing Time:** ~1-2 minutes for 1000 users

## Security Notes

- API_SECRET_KEY should be a random 32+ character string
- CRON_SECRET_KEY should be unique from API_SECRET_KEY
- Never expose these keys in client-side code
- SendGrid API key has email-sending-only scope in production
- Verify sender domain is owned by your organization

## Future Enhancements

1. **Email Analytics:**
   - Track open rates, click rates per email
   - Identify which emails drive conversions
   - A/B test subject lines

2. **Dynamic Content:**
   - Personalize based on user behavior
   - Show different CTAs based on activity level
   - Include actual profit numbers in Profit Dashboard email

3. **Segmentation:**
   - Different sequences for different user types
   - High-value vs. low-engagement users
   - Geographic-specific content

4. **Reactivation Campaign:**
   - Win-back emails for churned users
   - "Come back" offers for lapsed free trial users
   - Special discounts for returning users

## Support

For issues with:
- **SendGrid:** See https://sendgrid.com/docs/
- **Email deliverability:** Check https://sendgrid.com/solutions/email-deliverability/
- **API authentication:** Review `/lib/auth-server.ts`
- **Database:** Check Supabase dashboard

---

**Last Updated:** 2026-05-23
**System Status:** Production Ready
**Email Sequences:** 10 templates, fully automated
