import sgMail from '@sendgrid/mail'

// Initialize SendGrid with lazy loading pattern
let sgMailClient: typeof sgMail | null = null

function getSendGridClient() {
  if (!sgMailClient) {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SENDGRID_API_KEY not set - email sending will be disabled')
      return null
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    sgMailClient = sgMail
  }
  return sgMailClient
}

interface EmailData {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
}

/**
 * Send an email via SendGrid
 * Handles both HTML and plain text versions
 */
export async function sendEmail(data: EmailData): Promise<boolean> {
  const client = getSendGridClient()
  if (!client) {
    console.warn('SendGrid not configured, email not sent:', data.subject)
    return false
  }

  try {
    const msg = {
      to: data.to,
      from: data.from || process.env.SENDGRID_FROM_EMAIL || 'noreply@bookkeepingapp.ca',
      subject: data.subject,
      text: data.text,
      html: data.html,
    }

    await sgMail.send(msg)
    console.log(`Email sent to ${data.to}: ${data.subject}`)
    return true
  } catch (error) {
    console.error(`Failed to send email to ${data.to}:`, error)
    return false
  }
}

/**
 * Send batch emails (up to 1000 at a time)
 * Used for bulk operations like daily email sends
 */
export async function sendBatchEmails(emails: EmailData[]): Promise<number> {
  const client = getSendGridClient()
  if (!client || emails.length === 0) {
    return 0
  }

  let successCount = 0

  try {
    // SendGrid allows up to 1000 emails in a single batch
    const batches = []
    for (let i = 0; i < emails.length; i += 1000) {
      batches.push(emails.slice(i, i + 1000))
    }

    for (const batch of batches) {
      for (const email of batch) {
        const msg = {
          to: email.to,
          from: email.from || process.env.SENDGRID_FROM_EMAIL || 'noreply@bookkeepingapp.ca',
          subject: email.subject,
          text: email.text,
          html: email.html,
        }
        await sgMail.send(msg)
      }
      successCount += batch.length
    }

    console.log(`Successfully sent ${successCount} emails`)
    return successCount
  } catch (error) {
    console.error('Batch email send failed:', error)
    return successCount
  }
}

/**
 * Render email template with user data substitution
 * Replaces placeholders like [FirstName], [receipt_count], etc.
 */
export function renderEmailTemplate(
  template: string,
  data: Record<string, any>
): string {
  let rendered = template

  // Replace all placeholders with actual values
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = new RegExp(`\\[${key}\\]`, 'g')
    rendered = rendered.replace(placeholder, String(value ?? ''))
  })

  return rendered
}

/**
 * Convert plain text email to HTML with basic formatting
 * Preserves line breaks and adds styling
 */
export function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  // Replace line breaks with <br>
  const withLineBreaks = escaped.replace(/\n/g, '<br />\n')

  // Wrap in basic HTML structure with email-safe styling
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    a {
      color: #2563eb;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .footer {
      font-size: 12px;
      color: #666;
      border-top: 1px solid #eee;
      padding-top: 20px;
      margin-top: 40px;
    }
  </style>
</head>
<body>
  ${withLineBreaks}
  <div class="footer">
    <p><a href="[unsubscribe_link]">Unsubscribe</a> | <a href="https://bookkeepingapp.ca">Visit BookkeepingApp</a></p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Create a properly formatted HTML email with branding
 */
export function createBrandedEmail(options: {
  subject: string
  preheader: string
  heading?: string
  content: string
  primaryCta?: { text: string; url: string }
  secondaryCta?: { text: string; url: string }
  footerText?: string
}): string {
  const { subject, preheader, heading, content, primaryCta, secondaryCta, footerText } = options

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 20px;
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #2563eb;
      text-decoration: none;
    }
    .content {
      margin: 30px 0;
      line-height: 1.8;
    }
    .heading {
      font-size: 24px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .cta-button {
      display: inline-block;
      padding: 12px 24px;
      margin: 20px 10px 20px 0;
      background-color: #2563eb;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      border: 2px solid #2563eb;
    }
    .cta-button:hover {
      background-color: #1d4ed8;
      border-color: #1d4ed8;
    }
    .cta-button-secondary {
      display: inline-block;
      padding: 12px 24px;
      margin: 20px 10px 20px 0;
      background-color: white;
      color: #2563eb;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      border: 2px solid #2563eb;
    }
    .cta-button-secondary:hover {
      background-color: #f0f9ff;
    }
    .footer {
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
      margin-top: 40px;
      text-align: center;
    }
    .footer a {
      color: #2563eb;
      text-decoration: none;
    }
    .highlight {
      background-color: #eff6ff;
      padding: 15px;
      border-left: 4px solid #2563eb;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div style="display: none; font-size: 0; color: #fefffe; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">
    ${preheader}
  </div>

  <div class="wrapper">
    <div class="header">
      <a href="https://bookkeepingapp.ca" class="logo">📚 BookkeepingApp</a>
    </div>

    ${heading ? `<h1 class="heading">${heading}</h1>` : ''}

    <div class="content">
      ${content}
    </div>

    ${
      primaryCta
        ? `<a href="${primaryCta.url}" class="cta-button">${primaryCta.text}</a>`
        : ''
    }

    ${
      secondaryCta
        ? `<a href="${secondaryCta.url}" class="cta-button-secondary">${secondaryCta.text}</a>`
        : ''
    }

    <div class="footer">
      ${footerText || 'Made for self-employed bookkeepers who want to spend less time on taxes, more time on business.'}
      <p>
        <a href="https://bookkeepingapp.ca">Visit BookkeepingApp</a> •
        <a href="[unsubscribe_link]">Unsubscribe</a>
      </p>
      <p>© 2026 BookkeepingApp. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
