/**
 * Email Conversion Sequence for Trial Users
 * Automated behavioral email campaign to convert free trial users to paying customers
 *
 * This system sends action-based emails that demonstrate progressive value
 * to maximize conversion and retention.
 */

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  preview: string
  trigger: 'signup' | 'first_receipt' | 'day_1' | 'day_2' | 'day_3' | 'day_5' | 'day_6' | 'trial_ending' | 'day_10_unpaid' | 'day_30_paid'
  triggerDays?: number
  condition?: (user: any) => boolean
  content: string
  cta: {
    text: string
    url: string
  }
  secondaryCta?: {
    text: string
    url: string
  }
}

/**
 * EMAIL 1: Welcome (Day 0 - Signup)
 * Goal: Set expectations, excite about value, encourage first action
 */
export const emailWelcome: EmailTemplate = {
  id: 'email_welcome',
  name: 'Welcome to Bookkeeping for Self-Employed',
  subject: '👋 Welcome! Your free trial is ready',
  preview: 'Snap a receipt. We\'ll handle the rest.',
  trigger: 'signup',
  content: `Hi [FirstName],

Welcome to Bookkeeping for Self-Employed!

You're about to discover something that will change how you handle finances:

📸 Snap a receipt with your phone
💡 We extract the date, amount, vendor, and category automatically
✓ Confirm in one tap
📊 Watch your profit dashboard update instantly

No more typing. No more spreadsheets. Just receipts → insights.

Ready? Take your first step:

Your 14-day free trial is active. Everything you need is already set up. Just log in and snap your first receipt to see the magic happen.

Questions? We're here to help.

Best,
The Bookkeeping for Self-Employed Team`,
  cta: {
    text: 'Snap My First Receipt',
    url: '[APP_URL]/receipts/snap'
  },
  secondaryCta: {
    text: 'Watch 60-Second Demo',
    url: '[APP_URL]/#demo'
  }
}

/**
 * EMAIL 2: Time Saved (Day 0 - First Receipt Scanned)
 * Goal: Show immediate time value, build momentum, encourage more receipts
 * Trigger: Fires immediately when user scans first receipt
 */
export const emailTimeSaved: EmailTemplate = {
  id: 'email_time_saved',
  name: 'You Just Saved 10 Minutes',
  subject: '⏱️ You just did in 30 seconds what normally takes 10 minutes',
  preview: 'That receipt? Manually entered it would take 10 minutes. You did it in 30 seconds.',
  trigger: 'first_receipt',
  content: `Hi [FirstName],

You just scanned a receipt for [receipt_vendor].

Stop and think about this for a second:

Normally, you'd:
⏳ 1-2 minutes to find it in your pile
⏳ 3-4 minutes to open your spreadsheet/QuickBooks
⏳ 3-4 minutes to type: date, amount, vendor, category
⏳ 1-2 minutes to verify it's correct

Total: ~10 minutes per receipt

What you just did: 30 seconds. Snap. Done.

Multiply that by the receipts you'll process this month...

If you scan just 10 receipts/week (very conservative for self-employed):
- Manual entry: 100 minutes/week = 7+ hours/month
- Your way: 5 minutes/week = 20 minutes/month

**You just saved 6+ hours per month.**

That's time you could spend on billable work. Or sleeping. Your choice.

Keep going. Snap another receipt and watch your profit dashboard update automatically.

Your profit is waiting,
The Team`,
  cta: {
    text: 'Snap Another Receipt',
    url: '[APP_URL]/receipts/snap'
  }
}

/**
 * EMAIL 3: Profit Dashboard (Day 1)
 * Goal: Show money value, demonstrate financial clarity, show dashboard power
 */
export const emailProfitDashboard: EmailTemplate = {
  id: 'email_profit_dashboard',
  name: 'Here\'s Your Profit (It Might Surprise You)',
  subject: '💰 Here\'s your profit. (Your accountant wishes you knew this monthly)',
  preview: 'Your dashboard is updated. Here\'s what your receipts reveal about your business.',
  trigger: 'day_1',
  triggerDays: 1,
  content: `Hi [FirstName],

You have [transaction_count] transactions recorded.

Here's what they tell you about your business:

📊 Total Revenue: $[total_revenue]
📉 Total Expenses: $[total_expenses]
💡 **Net Profit: $[net_profit]**

This is information most self-employed people only see once a year when their accountant delivers the bill.

You're seeing it NOW. Monthly. Weekly. Daily if you want.

Why does this matter?

Most self-employed people have NO IDEA if they're actually profitable.
- You think you're doing well → turns out expenses are killing you
- You think you're breaking even → surprise, you made more than expected
- You miss tax deductions → scramble at year-end

Not you. Not anymore.

Your dashboard shows exactly what's happening, right now. No guessing. No surprises at tax time.

See your complete financial picture:

[Dashboard metrics would appear here with real data]

This is why the $9/month Starter plan converts hundreds of self-employed users.

They pay $9/month for clarity they'd normally pay $500+ for from an accountant.

Ready to keep going?

Your profit awaits,
The Team`,
  cta: {
    text: 'View My Profit Dashboard',
    url: '[APP_URL]/'
  },
  secondaryCta: {
    text: 'Explore Reports',
    url: '[APP_URL]/reports/balance-sheet'
  }
}

/**
 * EMAIL 4: Social Proof (Day 2)
 * Goal: Build trust via case study, show real results, reduce buyer hesitation
 */
export const emailSocialProof: EmailTemplate = {
  id: 'email_social_proof',
  name: 'How Sarah Discovered $2K in Tax Deductions',
  subject: '💡 How a freelancer discovered $2,000 she was missing',
  preview: 'She thought she was breaking even. Her dashboard told a different story.',
  trigger: 'day_2',
  triggerDays: 2,
  content: `Hi [FirstName],

Meet Sarah. She's a freelance graphic designer in Toronto with 3 clients.

Every month she'd get paid, pay her expenses, and think: "Okay, I made about $3K profit this month."

Then tax time would hit and her accountant would say: "You owe $800 in taxes."

Sarah would panic: "But I thought I was only making $3K!"

The problem? She had no idea which expenses were deductible. Was home internet deductible? Office furniture? That coffee she bought while meeting a client?

She was leaving money on the table.

**Then she started using the dashboard.**

Week 1: She scanned her first 10 receipts. Dashboard showed: "Hey, you have $340 in potential tax-deductible supplies you haven't accounted for."

Week 2: More receipts. More clarity.

By the end of month 1, her dashboard revealed: **"You've missed ~$2,000 in deductible expenses."**

$2,000 × 30% (her tax rate) = **$600 in taxes she would have overpaid.**

In one month.

She switched to the Starter plan ($9/month) and now:
- Catches every deduction
- Knows her profit weekly
- Never gets surprised by tax season
- Pays less in taxes than she spends on her subscription

**Her ROI? 6,600% in month one.**

Here's the thing: You probably have the same blind spots Sarah did.

That's what your dashboard is here to fix.

Start scanning, start seeing, start saving,
The Team`,
  cta: {
    text: 'Keep Scanning Receipts',
    url: '[APP_URL]/receipts/snap'
  },
  secondaryCta: {
    text: 'Read More Success Stories',
    url: '[APP_URL]/#testimonials'
  }
}

/**
 * EMAIL 5: Scarcity/Urgency (Day 3)
 * Goal: Create urgency, show what they'd lose, motivate action
 */
export const emailScarcity: EmailTemplate = {
  id: 'email_scarcity',
  name: 'What You\'ll Lose When Your Trial Ends',
  subject: '⚠️ Here\'s what you\'ll lose when your trial ends in 11 days',
  preview: 'Your dashboard, your receipts, your profit insights. All gone in 11 days unless you upgrade.',
  trigger: 'day_3',
  triggerDays: 3,
  content: `Hi [FirstName],

Your free trial ends in 11 days.

Here's what happens when it does:

✗ Your dashboard disappears
✗ Your receipts are archived (read-only)
✗ Your profit insights go away
✗ Your tax-readiness data resets
✗ You're back to spreadsheets and guessing

You've already logged [days_used] days of transactions. That data? It's yours to keep only if you upgrade.

**Why does this matter?**

In 11 days, you'll face a choice:

**Option A: Keep the clarity**
Upgrade to Starter ($9/month or $84/year)
- Keep your dashboard
- Access your data anytime
- Weekly profit reports
- Tax-ready compliance
- 30-second receipt scanning

Cost: Less than a coffee per week.
Value: $600+ in taxes saved (based on users like Sarah)

**Option B: Go back to manual entry**
- Back to spreadsheets
- Back to guessing about profit
- Back to scrambling at tax time
- Back to overpaying taxes

**There's no Option C.** You can't keep your data free. The technology costs real money to run.

But $9/month? That's an investment that pays for itself 67x over in tax savings alone.

The clock is ticking. Your trial data expires in 11 days.

Here's what I'd do:

1. Scan 10 more receipts this week (takes 5 minutes)
2. Look at your profit dashboard
3. Calculate how much you'd save in taxes with complete data
4. Then decide if $9/month is worth it

Most people say: "Why didn't I start earlier?"

Don't be the person who has to rebuild their data from scratch in January.

Upgrade now, keep your data:`,
  cta: {
    text: 'Upgrade to Starter ($9/month)',
    url: '[APP_URL]/pricing'
  },
  secondaryCta: {
    text: 'Keep Using Free Version',
    url: '[APP_URL]/'
  }
}

/**
 * EMAIL 6: Tax Readiness (Day 5)
 * Goal: Show tax compliance value, reduce anxiety, emphasize peace of mind
 */
export const emailTaxReadiness: EmailTemplate = {
  id: 'email_tax_readiness',
  name: '✓ Your Taxes Are Ready (Most People\'s Aren\'t)',
  subject: '✓ It\'s May and your taxes are ready. Most freelancers are panicking.',
  preview: 'You\'re already ahead. Your dashboard shows exactly what your accountant needs for tax season.',
  trigger: 'day_5',
  triggerDays: 5,
  content: `Hi [FirstName],

It's Day 5. You've scanned [receipt_count] receipts.

Here's what most self-employed people are doing right now (May):

😰 Frantically searching for receipts
😰 Wondering: "Did I deduct that?"
😰 Dreading the call with their accountant
😰 Expecting a huge tax bill they can't explain
😰 Paying $500+ for an accountant to figure it out

Here's what YOU'RE doing:

✓ Your receipts are organized
✓ Your deductions are categorized
✓ Your profit is clear
✓ You KNOW what you owe
✓ You'll pay your accountant half (because your data is already clean)

**This is the difference between panic and peace of mind.**

The difference between scrambling and sleeping well.

The difference between overpaying taxes and saving thousands.

And you're doing it for $9/month.

Compare that to:
- $500 accountant fees (if they have to reconstruct your books)
- $250 accounting software (that you'll never use)
- Hours of your own time (worth way more than $9/month)
- Stress and uncertainty (priceless)

You're already ahead. Don't lose this momentum.

Your trial ends in 9 days. Upgrade to Professional ($29/month) for:
- Everything in Starter
- Unlimited clients
- Bank reconciliation
- Advanced reports
- Priority support

Or stick with Starter ($9/month) for:
- Everything you need
- Complete tax readiness
- Peace of mind

Either way, upgrade before your data disappears.

One less thing to worry about,
The Team`,
  cta: {
    text: 'Upgrade Now',
    url: '[APP_URL]/pricing'
  }
}

/**
 * EMAIL 7: Trial Ending Soon (Day 6)
 * Goal: Final push before trial ends, highlight conversion value, clear pricing
 */
export const emailTrialEnding: EmailTemplate = {
  id: 'email_trial_ending',
  name: '⏰ Trial Ends in 8 Days - Here\'s Your Options',
  subject: '⏰ Your trial ends in 8 days. Choose your plan.',
  preview: 'Keep your data and insights. Upgrade today.',
  trigger: 'day_6',
  triggerDays: 6,
  content: `Hi [FirstName],

Your free trial ends in 8 days.

Here's the simple decision:

---

**OPTION 1: Starter Plan - $9/month**
✓ 30-second receipt scanning
✓ Automatic profit dashboard
✓ Tax-ready reporting
✓ GST/HST compliance
✓ Mobile-friendly
✓ Keep your [receipt_count] scanned receipts

Best for: Solo freelancers, contractors, service providers

---

**OPTION 2: Professional Plan - $29/month**
✓ Everything in Starter, PLUS:
✓ Unlimited clients (Starter: 5)
✓ Bank reconciliation
✓ Advanced financial reports
✓ GST filing preparation
✓ Team access (1 additional user)
✓ Priority support

Best for: Multi-client consultants, small business owners

---

**OPTION 3: Do Nothing**
✗ Your data is archived (read-only)
✗ You lose access to your dashboard
✗ Back to manual entry
✗ Back to guessing about profit
✗ Back to tax season panic

---

**Most customers choose Starter ($9/month).**

Why? Because $9/month for profit clarity and tax peace of mind is a no-brainer.

"I wasted 2 hours this month on manual data entry before discovering this. Worth every penny." - Marcus, Freelance Developer

Ready to upgrade? Click below:

Starter is perfect for most. Let me guide you to the right plan:`,
  cta: {
    text: 'Choose Your Plan',
    url: '[APP_URL]/pricing'
  },
  secondaryCta: {
    text: 'Need Help? Chat with Us',
    url: '[APP_URL]/#chat'
  }
}

/**
 * EMAIL 8: Final Conversion Push (Day 7)
 * Goal: Last chance urgency, risk reversal, remove objections
 */
export const emailFinalPush: EmailTemplate = {
  id: 'email_final_push',
  name: '⏳ Last Day - Don\'t Lose Your Data',
  subject: '⏳ LAST DAY: Your data expires tomorrow',
  preview: 'Upgrade in the next 24 hours to keep everything.',
  trigger: 'trial_ending',
  triggerDays: 7,
  content: `Hi [FirstName],

This is it.

Your trial expires **tomorrow at midnight.**

When it does, your [receipt_count] scanned receipts go read-only.

Your profit dashboard disappears.

Your tax-readiness report is archived.

Everything you've built over the last week is gone.

---

**Unless you upgrade in the next 24 hours.**

Here's the thing: Most people who lose access say the same thing:

"I wish I'd upgraded before it expired. Now I have to rebuild everything."

Don't be that person.

**It takes 60 seconds to upgrade:**

1. Click the button below
2. Enter your payment info (Stripe is secure)
3. Done. Your data is safe. Your dashboard stays live.

**Not sure? Here's our promise:**

Cancel anytime. No questions. No cancellation fees. We'll refund your last month if you cancel within 30 days.

Most people who try Starter stay because the ROI is too obvious to ignore.

You've already seen it: Profit clarity. Tax readiness. Time saved.

Don't let it disappear.

---

**24 hours left. Upgrade now:**`,
  cta: {
    text: 'Upgrade Before It\'s Gone',
    url: '[APP_URL]/pricing?highlight=starter'
  },
  secondaryCta: {
    text: 'Need a Payment Plan? Contact Us',
    url: '[APP_URL]/#contact'
  }
}

/**
 * EMAIL 9: Last Chance (Day 10 - If Unpaid)
 * Goal: Final urgency, data loss consequence, reactivation option
 */
export const emailLastChance: EmailTemplate = {
  id: 'email_last_chance',
  name: '❌ Your Data Will Be Deleted in 3 Days',
  subject: '❌ 3 days left: Your receipts will be permanently deleted',
  preview: 'After today, we delete trial data. You can restore everything if you upgrade.',
  trigger: 'day_10_unpaid',
  triggerDays: 10,
  condition: (user) => !user.subscription_id,
  content: `Hi [FirstName],

I'm going to be direct.

Your trial ended 3 days ago.

In 3 days, we permanently delete all trial data to comply with privacy regulations.

That means:
❌ [receipt_count] scanned receipts - GONE
❌ [transaction_count] transactions - GONE
❌ Your profit insights - GONE
❌ Your tax data - GONE

**It's not recoverable after that.**

Here's the window: You have 3 days to upgrade and save it all.

After that, you start from zero.

---

**Why am I being so direct?**

Because I've seen too many people in your situation say: "Wait, I actually need this..."

And then they lose 3 weeks of work.

You've already done the hard part. You've scanned the receipts. You've seen the value.

Don't throw that away.

**Upgrade in the next 3 days to keep everything:**

- $9/month Starter (most popular)
- $29/month Professional (unlimited clients)
- $0/month if you decide this isn't for you (we understand)

But choose quick. The data deletion happens in 3 days.`,
  cta: {
    text: 'Upgrade & Save My Data',
    url: '[APP_URL]/pricing'
  },
  secondaryCta: {
    text: 'Not Ready? That\'s Okay',
    url: '[APP_URL]/pricing?action=skip'
  }
}

/**
 * EMAIL 10: Retention & Engagement (Day 30 - If Paid)
 * Goal: Maximize lifetime value, encourage deeper product use, reduce churn
 */
export const emailRetention: EmailTemplate = {
  id: 'email_retention',
  name: '💡 Pro Tip: The $1,500 Deduction Most Freelancers Miss',
  subject: '💡 99% of freelancers miss this tax deduction. You won\'t.',
  preview: 'Here\'s a deduction that could save you $450 in taxes this year.',
  trigger: 'day_30_paid',
  triggerDays: 30,
  condition: (user) => !!user.subscription_id && user.days_as_subscriber === 30,
  content: `Hi [FirstName],

You've been using Bookkeeping for Self-Employed for 30 days.

Your dashboard shows [metric_data]. You're tracking your profit like a pro.

Now let me share something that could save you hundreds in taxes.

**The Home Office Deduction**

Most self-employed people either:
A) Claim it wrong and get audited
B) Don't claim it at all and leave money on the table

Here's what the CRA allows:

If you use 10% of your home exclusively for work, you can deduct:
- 10% of mortgage interest/rent
- 10% of utilities
- 10% of home insurance
- Property tax percentage
- Home maintenance
- Internet (if you use it for work)

Average deduction: $1,500-2,000/year
Tax savings: $450-600

**How to capture it in your dashboard:**

1. Go to Chart of Accounts
2. Create account: "Home Office Deduction"
3. Create monthly journal entry for your estimated percentage
4. Your dashboard automatically calculates savings

**Want to go deeper?**

Your Professional plan ($29/month) includes:
- Automated GST/HST filing prep
- Advanced deduction categories
- CRA-compliant reporting
- Accountant-ready exports

Most users upgrade to Professional for this reason alone. One deduction = 60+ months of subscription cost.

Try it. Let me know if you need help setting it up.

Making your money work,
The Team`,
  cta: {
    text: 'Set Up Home Office Deduction',
    url: '[APP_URL]/settings/accounts'
  },
  secondaryCta: {
    text: 'Upgrade to Professional',
    url: '[APP_URL]/pricing'
  }
}

/**
 * Complete sequence for easy reference
 */
export const emailSequence: EmailTemplate[] = [
  emailWelcome,
  emailTimeSaved,
  emailProfitDashboard,
  emailSocialProof,
  emailScarcity,
  emailTaxReadiness,
  emailTrialEnding,
  emailFinalPush,
  emailLastChance,
  emailRetention,
]

/**
 * Export as object for easy lookup in API routes
 */
export const EMAIL_SEQUENCES: Record<string, EmailTemplate> = {
  email_welcome: emailWelcome,
  email_time_saved: emailTimeSaved,
  email_profit_dashboard: emailProfitDashboard,
  email_social_proof: emailSocialProof,
  email_scarcity: emailScarcity,
  email_tax_readiness: emailTaxReadiness,
  email_trial_ending: emailTrialEnding,
  email_final_push: emailFinalPush,
  email_last_chance: emailLastChance,
  email_retention: emailRetention,
}

/**
 * Get email template by ID
 */
export function getEmailTemplate(id: string): EmailTemplate | undefined {
  return emailSequence.find(email => email.id === id)
}

/**
 * Get next email ID for user based on signup date and actions
 * Returns null if user has no pending emails
 */
export function getNextEmailForUser(user: any): string | null {
  const daysSinceSignup = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
  const isSubscribed = !!user.subscription_id
  const emailsSent = (user.emails_sent || []) as string[]

  // Check welcome email (only send if user just signed up and hasn't received it yet)
  if (daysSinceSignup === 0 && !emailsSent.includes('email_welcome')) {
    return 'email_welcome'
  }

  // Map of trigger → check function
  const checks = {
    'first_receipt': () => user.first_receipt_scanned_at && !emailsSent.includes('email_time_saved'),
    'day_1': () => daysSinceSignup >= 1 && !emailsSent.includes('email_profit_dashboard'),
    'day_2': () => daysSinceSignup >= 2 && !emailsSent.includes('email_social_proof'),
    'day_3': () => daysSinceSignup >= 3 && !emailsSent.includes('email_scarcity'),
    'day_5': () => daysSinceSignup >= 5 && !emailsSent.includes('email_tax_readiness'),
    'day_6': () => daysSinceSignup >= 6 && !emailsSent.includes('email_trial_ending'),
    'trial_ending': () => daysSinceSignup >= 7 && !isSubscribed && !emailsSent.includes('email_final_push'),
    'day_10_unpaid': () => daysSinceSignup >= 10 && !isSubscribed && !emailsSent.includes('email_last_chance'),
    'day_30_paid': () => daysSinceSignup >= 30 && isSubscribed && !emailsSent.includes('email_retention'),
  }

  // Return first matching email ID
  for (const email of emailSequence) {
    if (email.trigger === 'signup') continue // Skip welcome, already checked above
    if (checks[email.trigger as keyof typeof checks]?.()) {
      return email.id
    }
  }

  return null
}
