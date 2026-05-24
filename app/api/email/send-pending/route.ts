import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendEmail, createBrandedEmail, renderEmailTemplate } from '@/lib/sendgrid-service'
import { getEmailTemplate, getNextEmailForUser, EMAIL_SEQUENCES } from '@/lib/email-sequences'

/**
 * Verify that the request is authorized
 * Supports both cron jobs with secret and internal API calls
 */
function verifyRequest(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  const cronSecret = req.headers.get('x-cron-secret')

  // Check for Bearer token (internal API calls)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    return token === process.env.API_SECRET_KEY
  }

  // Check for cron secret
  if (cronSecret) {
    return cronSecret === process.env.CRON_SECRET_KEY
  }

  return false
}

/**
 * Send pending emails to all users
 * This runs daily via a cron job or can be triggered manually
 * POST /api/email/send-pending
 */
export async function POST(req: NextRequest) {
  // Verify request is authorized
  if (!verifyRequest(req)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  let sentCount = 0
  let errorCount = 0
  const errors: string[] = []

  try {
    // Fetch all users with their subscription and email data
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('email_verified', true) // Only send to verified users

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch users', details: usersError.message },
        { status: 500 }
      )
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        sentCount: 0,
        errorCount: 0,
        message: 'No users found to send emails to',
      })
    }

    console.log(`Processing ${users.length} users for email sending...`)

    // Process each user
    for (const user of users) {
      try {
        // Get the next email this user should receive
        const nextEmailId = getNextEmailForUser(user)

        if (!nextEmailId) {
          // User doesn't need any emails right now
          continue
        }

        // Check if we've already sent this email to this user
        const emailsSent = (user.emails_sent || []) as string[]
        if (emailsSent.includes(nextEmailId)) {
          continue
        }

        // Get the email template
        const emailTemplate = getEmailTemplate(nextEmailId)
        if (!emailTemplate) {
          console.warn(`Email template not found: ${nextEmailId}`)
          continue
        }

        // Prepare user data for template rendering
        const userData = {
          firstName: user.first_name || user.email.split('@')[0],
          email: user.email,
          receipt_count: user.receipt_count || 0,
          trial_days_remaining: Math.max(
            0,
            14 - Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
          ),
          formatted_trial_end: new Date(
            new Date(user.created_at).getTime() + 14 * 24 * 60 * 60 * 1000
          ).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
          subscription_status: user.subscription_status || 'free',
        }

        // Render the email content with user data
        const content = renderEmailTemplate(emailTemplate.content, userData)
        const subject = renderEmailTemplate(emailTemplate.subject, userData)
        const cta = emailTemplate.cta
          ? {
              text: renderEmailTemplate(emailTemplate.cta.text, userData),
              url: renderEmailTemplate(emailTemplate.cta.url, userData),
            }
          : undefined
        const secondaryCta = emailTemplate.secondaryCta
          ? {
              text: renderEmailTemplate(emailTemplate.secondaryCta.text, userData),
              url: renderEmailTemplate(emailTemplate.secondaryCta.url, userData),
            }
          : undefined

        // Create branded HTML email
        const htmlContent = createBrandedEmail({
          subject,
          preheader: emailTemplate.preview,
          heading: emailTemplate.name,
          content,
          primaryCta: cta,
          secondaryCta: secondaryCta,
        })

        // Send the email
        const sent = await sendEmail({
          to: user.email,
          subject,
          html: htmlContent,
          text: content,
        })

        if (sent) {
          // Track that we sent this email
          const updatedEmailsSent = [...emailsSent, nextEmailId]
          await supabase
            .from('users')
            .update({
              emails_sent: updatedEmailsSent,
              last_email_sent_at: new Date().toISOString(),
            })
            .eq('id', user.id)

          sentCount++
          console.log(
            `Sent email "${nextEmailId}" to ${user.email} (user: ${user.id})`
          )
        } else {
          errorCount++
          const msg = `Failed to send email "${nextEmailId}" to ${user.email}`
          errors.push(msg)
          console.error(msg)
        }
      } catch (userError) {
        errorCount++
        const msg = `Error processing user ${user.id}: ${
          userError instanceof Error ? userError.message : 'Unknown error'
        }`
        errors.push(msg)
        console.error(msg)
      }
    }

    // Log results
    console.log(
      `Email send complete: ${sentCount} sent, ${errorCount} errors out of ${users.length} users`
    )

    return NextResponse.json(
      {
        success: true,
        sentCount,
        errorCount,
        processedUsers: users.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Sent ${sentCount} emails, ${errorCount} errors`,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Email sending failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Email sending failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for monitoring/manual triggers
 * Returns status of the last email send run
 */
export async function GET(req: NextRequest) {
  // Verify request
  if (!verifyRequest(req)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    // Get stats about emails sent today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: sentToday, error } = await supabase
      .from('users')
      .select('id')
      .gte('last_email_sent_at', today.toISOString())

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      emailsSentToday: sentToday?.length || 0,
      availableTemplates: Object.keys(EMAIL_SEQUENCES).length,
      lastRun: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
