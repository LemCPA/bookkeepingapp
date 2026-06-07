import sgMail from '@sendgrid/mail'

// Initialize SendGrid
const sendGridApiKey = process.env.SENDGRID_API_KEY
if (sendGridApiKey) {
  sgMail.setApiKey(sendGridApiKey)
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@bookkeepingapp.ca'

/**
 * Send payment failed notification
 */
export async function sendPaymentFailedEmail(email: string, userName: string) {
  if (!sendGridApiKey) {
    console.warn('[EMAIL] SendGrid API key not configured, skipping email')
    return false
  }

  try {
    await sgMail.send({
      to: email,
      from: FROM_EMAIL,
      subject: '⚠️ Payment Failed - Action Required',
      html: `
        <h1>Payment Failed</h1>
        <p>Hi ${userName},</p>
        <p>Your recent payment for your Bookkeeping App subscription failed.</p>
        <p><strong>You have 14 days to update your payment method.</strong> After that, your subscription will be cancelled and you'll lose access to your account.</p>
        <p><a href="https://bookkeepingapp.ca/billing" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Update Payment Method</a></p>
        <p>If you have any questions, please contact support.</p>
        <p>Best regards,<br>Bookkeeping App Team</p>
      `,
    })
    console.log(`[EMAIL] Payment failed notification sent to ${email}`)
    return true
  } catch (error) {
    console.error('[EMAIL] Error sending payment failed email:', error)
    return false
  }
}

/**
 * Send grace period warning (7 days remaining)
 */
export async function sendGracePeriodWarningEmail(email: string, userName: string, daysRemaining: number) {
  if (!sendGridApiKey) {
    console.warn('[EMAIL] SendGrid API key not configured, skipping email')
    return false
  }

  try {
    await sgMail.send({
      to: email,
      from: FROM_EMAIL,
      subject: `⏰ Final Notice: ${daysRemaining} Days to Resolve Payment`,
      html: `
        <h1>Final Notice: Payment Required</h1>
        <p>Hi ${userName},</p>
        <p>Your Bookkeeping App subscription payment is still outstanding.</p>
        <p><strong>You have ${daysRemaining} days remaining</strong> to update your payment method before your subscription is cancelled and you lose access to your data.</p>
        <p><a href="https://bookkeepingapp.ca/billing" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Update Payment Now</a></p>
        <p>If there's an issue with your payment method, please contact support immediately.</p>
        <p>Best regards,<br>Bookkeeping App Team</p>
      `,
    })
    console.log(`[EMAIL] Grace period warning sent to ${email} (${daysRemaining} days remaining)`)
    return true
  } catch (error) {
    console.error('[EMAIL] Error sending grace period warning email:', error)
    return false
  }
}

/**
 * Send subscription cancelled confirmation
 */
export async function sendSubscriptionCancelledEmail(email: string, userName: string) {
  if (!sendGridApiKey) {
    console.warn('[EMAIL] SendGrid API key not configured, skipping email')
    return false
  }

  try {
    await sgMail.send({
      to: email,
      from: FROM_EMAIL,
      subject: 'Subscription Cancelled',
      html: `
        <h1>Subscription Cancelled</h1>
        <p>Hi ${userName},</p>
        <p>Your Bookkeeping App subscription has been cancelled.</p>
        <p>Your data will be preserved for 2 years. If you'd like to reactivate your account, please contact support.</p>
        <p>Best regards,<br>Bookkeeping App Team</p>
      `,
    })
    console.log(`[EMAIL] Subscription cancelled notification sent to ${email}`)
    return true
  } catch (error) {
    console.error('[EMAIL] Error sending subscription cancelled email:', error)
    return false
  }
}

/**
 * Send data deletion warning (30 days before deletion)
 */
export async function sendDataDeletionWarningEmail(email: string, userName: string, daysRemaining: number) {
  if (!sendGridApiKey) {
    console.warn('[EMAIL] SendGrid API key not configured, skipping email')
    return false
  }

  try {
    await sgMail.send({
      to: email,
      from: FROM_EMAIL,
      subject: `⚠️ Your Data Will Be Deleted in ${daysRemaining} Days`,
      html: `
        <h1>Final Warning: Data Deletion Coming</h1>
        <p>Hi ${userName},</p>
        <p>Your cancelled Bookkeeping App account data will be permanently deleted in <strong>${daysRemaining} days</strong>.</p>
        <p>If you'd like to reactivate your account and restore access to your data, please do so now:</p>
        <p><a href="https://bookkeepingapp.ca/billing" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reactivate Account</a></p>
        <p>After ${daysRemaining} days, your data cannot be recovered.</p>
        <p>Best regards,<br>Bookkeeping App Team</p>
      `,
    })
    console.log(`[EMAIL] Data deletion warning sent to ${email} (${daysRemaining} days remaining)`)
    return true
  } catch (error) {
    console.error('[EMAIL] Error sending data deletion warning email:', error)
    return false
  }
}
