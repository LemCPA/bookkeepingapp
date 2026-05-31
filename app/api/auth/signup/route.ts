import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, isValidPassword } from '@/lib/bcrypt-utils'
import { createJWTToken, createRefreshToken } from '@/lib/jwt-utils'
import { getDb, saveDb, getUserByEmail, createAccount } from '@/lib/db'
import { getUserByEmailFromSupabase, createUserInSupabase } from '@/lib/supabase-db'

// Default T2125 accounts for Canadian sole proprietors
const DEFAULT_ACCOUNTS = [
  { code: '1000', name: 'Cash', type: 'ASSET' },
  { code: '1010', name: 'Checking Account', type: 'ASSET' },
  { code: '1020', name: 'Savings Account', type: 'ASSET' },
  { code: '1030', name: 'Accounts Receivable', type: 'ASSET' },
  { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
  { code: '2010', name: 'Credit Card', type: 'LIABILITY' },
  { code: '3000', name: 'Retained Earnings', type: 'EQUITY' },
  { code: '4000', name: 'Service Revenue', type: 'INCOME' },
  { code: '4010', name: 'Product Revenue', type: 'INCOME' },
  { code: '5100', name: 'Advertising', type: 'EXPENSE' },
  { code: '5110', name: 'Meals and Entertainment (50% rule)', type: 'EXPENSE' },
  { code: '5120', name: 'Insurance', type: 'EXPENSE' },
  { code: '5130', name: 'Interest and Bank Charges', type: 'EXPENSE' },
  { code: '5140', name: 'Business Taxes and Licenses', type: 'EXPENSE' },
  { code: '5150', name: 'Office Expenses', type: 'EXPENSE' },
  { code: '5160', name: 'Supplies', type: 'EXPENSE' },
  { code: '5170', name: 'Legal and Accounting Fees', type: 'EXPENSE' },
  { code: '5180', name: 'Rent', type: 'EXPENSE' },
  { code: '5190', name: 'Salaries and Wages', type: 'EXPENSE' },
  { code: '5200', name: 'Travel', type: 'EXPENSE' },
  { code: '5210', name: 'Telephone and Utilities', type: 'EXPENSE' },
  { code: '5220', name: 'Motor Vehicle Expenses - Fuel and Oil', type: 'EXPENSE' },
  { code: '5221', name: 'Motor Vehicle Expenses - Interest (Loan)', type: 'EXPENSE' },
  { code: '5222', name: 'Motor Vehicle Expenses - Insurance', type: 'EXPENSE' },
  { code: '5223', name: 'Motor Vehicle Expenses - Licence and Registration', type: 'EXPENSE' },
  { code: '5224', name: 'Motor Vehicle Expenses - Maintenance and Repairs', type: 'EXPENSE' },
  { code: '5225', name: 'Motor Vehicle Expenses - Parking and Tolls', type: 'EXPENSE' },
  { code: '5226', name: 'Motor Vehicle Expenses - Other', type: 'EXPENSE' },
  { code: '5230', name: 'Capital Cost Allowance (CCA)', type: 'EXPENSE' },
  { code: '5240', name: 'Other Expenses', type: 'EXPENSE' },
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    const passwordValidation = isValidPassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', details: passwordValidation.errors },
        { status: 400 }
      )
    }

    // Check if user already exists (try Supabase first, then JSON)
    let existingUser = await getUserByEmailFromSupabase(email)
    if (!existingUser) {
      existingUser = getUserByEmail(email)
    }
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Try to create user in Supabase first
    let newUser = await createUserInSupabase(email, passwordHash, name)

    // If Supabase is not available, fall back to JSON
    if (!newUser) {
      const db = getDb()
      const userId = db.nextUserId++
      newUser = {
        id: userId,
        email,
        password_hash: passwordHash,
        name,
        email_verified: true, // In production, set to false and send verification email
        gst_registered: false,
        default_gst_hst_rate: 13, // Default to Ontario HST
        created_at: new Date().toISOString(),
      }
      db.users.push(newUser)
      saveDb(db)
    }

    // Automatically create default accounts for new user
    const userId = newUser.id
    DEFAULT_ACCOUNTS.forEach(acc => {
      createAccount(acc.code, acc.name, acc.type, userId)
    })

    // Generate tokens (use ID for JWT)
    const accessToken = createJWTToken(userId, email)
    const refreshToken = createRefreshToken(userId)

    // Send welcome email (non-blocking - don't fail signup if email fails)
    // Note: Email sending is async and fire-and-forget
    // Dynamically import to avoid hard dependency
    if (process.env.SENDGRID_API_KEY?.startsWith('SG.')) {
      try {
        const { sendEmail, createBrandedEmail, renderEmailTemplate } = await import('@/lib/sendgrid-service')
        const { getEmailTemplate } = await import('@/lib/email-sequences')

        const welcomeTemplate = getEmailTemplate('email_welcome')
        if (welcomeTemplate) {
          const firstName = name.split(' ')[0]
          const userData = {
            FirstName: firstName,
            APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://bookkeepingapp.ca',
          }

          const content = renderEmailTemplate(welcomeTemplate.content, userData)
          const subject = renderEmailTemplate(welcomeTemplate.subject, userData)
          const cta = {
            text: renderEmailTemplate(welcomeTemplate.cta.text, userData),
            url: renderEmailTemplate(welcomeTemplate.cta.url, userData),
          }
          const secondaryCta = welcomeTemplate.secondaryCta
            ? {
                text: renderEmailTemplate(welcomeTemplate.secondaryCta.text, userData),
                url: renderEmailTemplate(welcomeTemplate.secondaryCta.url, userData),
              }
            : undefined

          const htmlContent = createBrandedEmail({
            subject,
            preheader: welcomeTemplate.preview,
            heading: welcomeTemplate.name,
            content,
            primaryCta: cta,
            secondaryCta: secondaryCta,
          })

          // Send email async without waiting
          sendEmail({
            to: email,
            subject,
            html: htmlContent,
            text: content,
          }).catch(err => console.warn('Failed to queue welcome email:', err))
        }
      } catch (emailError) {
        // Log but don't fail signup
        console.warn('Welcome email setup failed:', emailError)
      }
    }

    // Return user data without password
    const { password_hash, ...userWithoutPassword } = newUser as any
    return NextResponse.json({
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    }, { status: 201 })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
