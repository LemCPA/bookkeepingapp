import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, isValidPassword } from '@/lib/bcrypt-utils'
import { createJWTToken, createRefreshToken } from '@/lib/jwt-utils'
import { getDb, saveDb, getUserByEmail, createAccount } from '@/lib/db'
import { createStripeCustomer } from '@/lib/stripe-utils'
import { DEFAULT_ACCOUNTS } from '@/lib/default-accounts'

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

    // Create user in JSON database
    let newUser = null
    {
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

    // Create Stripe customer for new user
    let stripeCustomerId: string | null = null
    try {
      stripeCustomerId = await createStripeCustomer(email, name)
      console.log(`[SIGNUP] Created Stripe customer: ${stripeCustomerId} for user ${newUser.id}`)
    } catch (error) {
      console.warn(`[SIGNUP] Failed to create Stripe customer for ${email}:`, error)
      // Don't fail signup if Stripe creation fails
    }

    // Add stripe_customer_id to user object
    if (stripeCustomerId) {
      newUser.stripe_customer_id = stripeCustomerId

      // If user was created in JSON fallback, save the updated db
      if (!await getUserByEmailFromSupabase(email)) {
        const db = getDb()
        const userIndex = db.users.findIndex(u => u.id === newUser.id)
        if (userIndex !== -1) {
          db.users[userIndex].stripe_customer_id = stripeCustomerId
          saveDb(db)
        }
      }
    }

    // Automatically create default accounts for new user (only accounts with codes)
    const userId = newUser.id
    DEFAULT_ACCOUNTS.forEach(acc => {
      // Only create accounts that have a code (skip HOME/VEHICLE sub-accounts which have no code)
      if (acc.code) {
        createAccount(acc.code, acc.name, acc.type, userId)
      }
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
