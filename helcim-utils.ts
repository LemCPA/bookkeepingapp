/**
 * Helcim Payment Processing Utilities
 * Handles all Helcim API interactions for subscription management
 */

import crypto from 'crypto'

/**
 * Helcim API Configuration
 */
export const HELCIM_API_BASE_URL = 'https://api.helcim.com'
export const HELCIM_WEBHOOK_SECRET = process.env.HELCIM_WEBHOOK_SECRET || ''

interface HelcimConfig {
  apiToken: string
  appId: string
  webhookSecret: string
}

/**
 * Get Helcim configuration from environment
 */
export function getHelcimConfig(): HelcimConfig {
  const apiToken = process.env.HELCIM_API_TOKEN
  const appId = process.env.HELCIM_APP_ID
  const webhookSecret = process.env.HELCIM_WEBHOOK_SECRET

  if (!apiToken || !appId || !webhookSecret) {
    throw new Error(
      'Helcim credentials not configured. Please add HELCIM_API_TOKEN, HELCIM_APP_ID, and HELCIM_WEBHOOK_SECRET to .env.local'
    )
  }

  return { apiToken, appId, webhookSecret }
}

/**
 * Make authenticated request to Helcim API
 */
async function helcimRequest(
  endpoint: string,
  method: string = 'GET',
  body?: Record<string, any>
) {
  const config = getHelcimConfig()

  const url = `${HELCIM_API_BASE_URL}${endpoint}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-KEY': config.apiToken,
    'X-APP-ID': config.appId,
  }

  const options: RequestInit = {
    method,
    headers,
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(url, options)

  if (!response.ok) {
    const error = await response.text()
    console.error(`Helcim API error [${response.status}]:`, error)
    throw new Error(`Helcim API error: ${response.status} - ${error}`)
  }

  return response.json()
}

/**
 * Create a new Helcim customer
 */
export async function createHelcimCustomer(
  email: string,
  name: string,
  metadata?: Record<string, string>
) {
  const body: Record<string, any> = {
    email,
    name,
  }

  if (metadata) {
    body.metadata = metadata
  }

  const response = await helcimRequest('/customers', 'POST', body)
  return response.data
}

/**
 * Create a new subscription in Helcim
 */
export async function createHelcimSubscription(
  customerId: string,
  planId: string,
  priceInCents: number,
  trialDays: number = 0
) {
  const body: Record<string, any> = {
    customer_id: customerId,
    plan_id: planId,
    amount: priceInCents,
    currency: 'CAD',
    billing_cycle: 'monthly',
  }

  if (trialDays > 0) {
    body.trial_days = trialDays
  }

  const response = await helcimRequest('/subscriptions', 'POST', body)
  return response.data
}

/**
 * Get subscription details from Helcim
 */
export async function getHelcimSubscription(subscriptionId: string) {
  const response = await helcimRequest(`/subscriptions/${subscriptionId}`)
  return response.data
}

/**
 * Update a subscription in Helcim
 */
export async function updateHelcimSubscription(
  subscriptionId: string,
  updates: Record<string, any>
) {
  const response = await helcimRequest(`/subscriptions/${subscriptionId}`, 'PATCH', updates)
  return response.data
}

/**
 * Cancel a subscription in Helcim
 */
export async function cancelHelcimSubscription(subscriptionId: string, reason?: string) {
  const body: Record<string, any> = {}

  if (reason) {
    body.cancellation_reason = reason
  }

  const response = await helcimRequest(
    `/subscriptions/${subscriptionId}/cancel`,
    'POST',
    body.cancellation_reason ? body : {}
  )
  return response.data
}

/**
 * Create a payment intent for initial subscription charge
 */
export async function createPaymentIntent(
  customerId: string,
  amount: number,
  currency: string = 'CAD',
  description?: string
) {
  const body: Record<string, any> = {
    customer_id: customerId,
    amount,
    currency,
  }

  if (description) {
    body.description = description
  }

  const response = await helcimRequest('/payment-intents', 'POST', body)
  return response.data
}

/**
 * Save a payment method for a customer
 */
export async function savePaymentMethod(
  customerId: string,
  paymentMethodToken: string,
  isDefault: boolean = false
) {
  const body = {
    customer_id: customerId,
    token: paymentMethodToken,
    is_default: isDefault,
  }

  const response = await helcimRequest('/payment-methods', 'POST', body)
  return response.data
}

/**
 * Delete a payment method
 */
export async function deletePaymentMethod(paymentMethodId: string) {
  const response = await helcimRequest(`/payment-methods/${paymentMethodId}`, 'DELETE')
  return response.data
}

/**
 * Get customer's payment methods
 */
export async function getPaymentMethods(customerId: string) {
  const response = await helcimRequest(`/customers/${customerId}/payment-methods`)
  return response.data
}

/**
 * Get invoice details
 */
export async function getInvoice(invoiceId: string) {
  const response = await helcimRequest(`/invoices/${invoiceId}`)
  return response.data
}

/**
 * Get customer's invoices
 */
export async function getCustomerInvoices(customerId: string, limit: number = 50) {
  const response = await helcimRequest(
    `/customers/${customerId}/invoices?limit=${limit}`
  )
  return response.data
}

/**
 * Download invoice PDF
 */
export async function downloadInvoicePdf(invoiceId: string): Promise<Buffer> {
  const config = getHelcimConfig()
  const url = `${HELCIM_API_BASE_URL}/invoices/${invoiceId}/pdf`
  const headers = {
    'X-API-KEY': config.apiToken,
    'X-APP-ID': config.appId,
  }

  const response = await fetch(url, { headers })

  if (!response.ok) {
    throw new Error(`Failed to download invoice: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Verify Helcim webhook signature
 * @param payload - Raw request body as string
 * @param signature - X-Helcim-Signature header value
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const config = getHelcimConfig()

  // Helcim signs webhooks using HMAC-SHA256
  const hash = crypto
    .createHmac('sha256', config.webhookSecret)
    .update(payload)
    .digest('hex')

  // Compare signatures using constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))
}

/**
 * Parse and validate Helcim webhook event
 */
export interface HelcimWebhookEvent {
  id: string
  type: string
  timestamp: string
  data: Record<string, any>
}

export function parseWebhookEvent(data: any): HelcimWebhookEvent {
  return {
    id: data.id,
    type: data.type,
    timestamp: data.timestamp,
    data: data.data || {},
  }
}

/**
 * Handle different webhook event types
 */
export async function handleWebhookEvent(event: HelcimWebhookEvent) {
  switch (event.type) {
    case 'payment.success':
      return handlePaymentSuccess(event.data)
    case 'payment.failed':
      return handlePaymentFailed(event.data)
    case 'subscription.created':
      return handleSubscriptionCreated(event.data)
    case 'subscription.updated':
      return handleSubscriptionUpdated(event.data)
    case 'subscription.canceled':
      return handleSubscriptionCanceled(event.data)
    case 'invoice.created':
      return handleInvoiceCreated(event.data)
    default:
      console.log(`Unknown webhook event type: ${event.type}`)
      return { handled: false }
  }
}

// Webhook event handlers
async function handlePaymentSuccess(data: any) {
  console.log('Payment successful:', data.id)
  return { handled: true, action: 'payment.success' }
}

async function handlePaymentFailed(data: any) {
  console.log('Payment failed:', data.id)
  return { handled: true, action: 'payment.failed' }
}

async function handleSubscriptionCreated(data: any) {
  console.log('Subscription created:', data.subscription_id)
  return { handled: true, action: 'subscription.created' }
}

async function handleSubscriptionUpdated(data: any) {
  console.log('Subscription updated:', data.subscription_id)
  return { handled: true, action: 'subscription.updated' }
}

async function handleSubscriptionCanceled(data: any) {
  console.log('Subscription canceled:', data.subscription_id)
  return { handled: true, action: 'subscription.canceled' }
}

async function handleInvoiceCreated(data: any) {
  console.log('Invoice created:', data.invoice_id)
  return { handled: true, action: 'invoice.created' }
}

/**
 * Test Helcim API connection
 * Used during setup to verify credentials are correct
 */
export async function testHelcimConnection(): Promise<boolean> {
  try {
    const config = getHelcimConfig()
    const response = await fetch(`${HELCIM_API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'X-API-KEY': config.apiToken,
        'X-APP-ID': config.appId,
      },
    })
    return response.ok
  } catch (error) {
    console.error('Helcim connection test failed:', error)
    return false
  }
}
