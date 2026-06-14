import { createClient } from '@supabase/supabase-js'
import { v5 as uuidv5 } from 'uuid'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_SECRET

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create Supabase client with service role key for server-side operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * Convert numeric user ID to deterministic UUID for Supabase
 * Uses UUID v5 with a fixed namespace to ensure same ID always generates same UUID
 * IMPORTANT: This has issues on Vercel where numeric IDs collide (all get ID 4)
 * Prefer emailToUuid() for new user creation
 */
const USER_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
export function numericIdToUuid(userId: number): string {
  return uuidv5(userId.toString(), USER_NAMESPACE)
}

/**
 * Convert email to deterministic UUID for Supabase
 * Uses UUID v5 with a fixed namespace
 * Email is unique per user, so this prevents UUID collisions
 */
export function emailToUuid(email: string): string {
  return uuidv5(email.toLowerCase(), USER_NAMESPACE)
}

/**
 * Get subscription for a user from Supabase
 * Returns the most recent subscription that is NOT canceled (includes active, past_due, trialing, etc.)
 * CRITICAL: Must use emailToUuid to match how subscriptions are saved in the webhook
 */
export async function getSubscriptionFromSupabase(userEmail: string) {
  try {
    const userUuid = emailToUuid(userEmail)
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userUuid)
      .order('created_at', { ascending: false })

    if (error && error.code !== 'PGRST116') {
      console.error('[SUPABASE] Error fetching subscription:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    // Return the most recent subscription that is NOT canceled
    // Includes: active, past_due, trialing, incomplete (but not canceled/incomplete_expired)
    const validStatuses = ['active', 'past_due', 'trialing', 'incomplete']
    const validSubscription = data.find(sub => validStatuses.includes(sub.status))

    if (validSubscription) {
      console.log(`[SUPABASE] Found subscription for ${userEmail}: ${validSubscription.id} (status: ${validSubscription.status})`)
      return validSubscription
    }

    // If no valid subscription, check if there are any canceled ones (for logging)
    const canceledSubscription = data.find(sub => sub.status === 'canceled' || sub.status === 'incomplete_expired')
    if (canceledSubscription) {
      console.log(`[SUPABASE] Only canceled subscription found for ${userEmail}`)
    }

    console.log(`[SUPABASE] No valid subscription found for ${userEmail}`)
    return null
  } catch (err) {
    console.error('[SUPABASE] Exception fetching subscription:', err)
    return null
  }
}

/**
 * Save subscription to Supabase
 * UPSERT: Updates if exists, inserts if new (atomic operation)
 */
export async function saveSubscriptionToSupabase(subscription: {
  user_id: string // UUID (converted from numeric ID)
  stripe_customer_id: string
  stripe_subscription_id: string
  plan: string
  status: string
  trial_end_date?: string | null
  current_period_start: string
  current_period_end: string
  created_at: string
  updated_at: string
  canceled_at?: string | null
}) {
  try {
    // First, try to find existing subscription by stripe_subscription_id
    const { data: existing, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', subscription.stripe_subscription_id)
      .single()

    console.log('[SUPABASE] Looking for existing subscription with ID:', subscription.stripe_subscription_id)
    console.log('[SUPABASE] Existing subscription:', existing)
    console.log('[SUPABASE] Fetch error:', fetchError)

    if (existing && existing.id) {
      // Update existing record
      console.log('[SUPABASE] Updating existing subscription record')
      const { data, error } = await supabase
        .from('subscriptions')
        .update(subscription)
        .eq('id', existing.id)
        .select()

      if (error) {
        console.error('[SUPABASE] Error updating subscription:', error)
        return false
      }

      console.log('[SUPABASE] Subscription updated:', data)
      return true
    } else {
      // Insert new record
      console.log('[SUPABASE] No existing subscription found, inserting new record')
      const { data, error } = await supabase
        .from('subscriptions')
        .insert([subscription])
        .select()

      if (error) {
        console.error('[SUPABASE] Error inserting subscription:', error)
        return false
      }

      console.log('[SUPABASE] Subscription inserted:', data)
      return true
    }
  } catch (err) {
    console.error('[SUPABASE] Exception saving subscription:', err)
    return false
  }
}

/**
 * Get user from Supabase
 */
export async function getUserFromSupabase(userId: number) {
  try {
    const userUuid = numericIdToUuid(userId)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userUuid)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[SUPABASE] Error fetching user:', error)
      return null
    }

    return data || null
  } catch (err) {
    console.error('[SUPABASE] Exception fetching user:', err)
    return null
  }
}

/**
 * Update user stripe_customer_id in Supabase
 */
export async function updateUserStripeCustomerId(userId: number, stripeCustomerId: string, email?: string) {
  try {
    // CRITICAL FIX: Use email-based UUID if provided, otherwise fall back to numeric ID
    // Email-based UUID must match what was used in syncUserToSupabase
    const userUuid = email ? emailToUuid(email) : numericIdToUuid(userId)
    console.log(`[SUPABASE] Updating stripe_customer_id for user ${userId} (UUID: ${userUuid}, email: ${email})`)

    const { data, error } = await supabase
      .from('users')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', userUuid)
      .select()

    if (error) {
      console.error('[SUPABASE] Error updating user stripe_customer_id:', error)
      return false
    }

    if (!data || data.length === 0) {
      console.error('[SUPABASE] Update returned no rows - user may not exist with UUID:', userUuid)
      return false
    }

    console.log('[SUPABASE] User stripe_customer_id updated successfully for user', userId)
    return true
  } catch (err) {
    console.error('[SUPABASE] Exception updating user:', err)
    return false
  }
}

/**
 * Sync user from local database to Supabase
 * Creates or updates user with UUID-based ID
 */
export async function syncUserToSupabase(userId: number, email: string, name: string) {
  try {
    // CRITICAL FIX: Use email for UUID generation, not numeric ID
    // Numeric ID is always 4 on Vercel (ephemeral database), causing UUID collisions
    // Email is unique per user, so this prevents collisions
    const userUuid = emailToUuid(email)
    console.log(`[SUPABASE] Syncing user: ${userId} (${email}) → UUID: ${userUuid} (from email)`)

    // Upsert user (insert or update if exists)
    // CRITICAL: Use 'email' for conflict resolution since email is the unique constraint
    // Not 'id' - even though id is primary key, email uniqueness is what causes conflicts
    const { data, error } = await supabase
      .from('users')
      .upsert([{
        id: userUuid,
        email,
        name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }], { onConflict: 'email' })
      .select()

    if (error) {
      console.error('[SUPABASE] Error syncing user:', error)
      return false
    }

    if (!data || data.length === 0) {
      console.error('[SUPABASE] Upsert returned no rows for user', userId)
      return false
    }

    console.log('[SUPABASE] User synced successfully:', userId, '→', userUuid, 'Data:', data[0])
    return true
  } catch (err) {
    console.error('[SUPABASE] Exception syncing user:', err)
    return false
  }
}

/**
 * Find user by stripe_customer_id in Supabase
 */
export async function findUserByStripeCustomerId(stripeCustomerId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('stripe_customer_id', stripeCustomerId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[SUPABASE] Error finding user by stripe_customer_id:', error)
      return null
    }

    return data || null
  } catch (err) {
    console.error('[SUPABASE] Exception finding user:', err)
    return null
  }
}

/**
 * Create or ensure user exists in Supabase
 */
export async function ensureUserInSupabase(userId: number, email: string, name: string) {
  try {
    // First check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingUser) {
      return existingUser
    }

    // User doesn't exist, create them
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        id: userId,
        email,
        name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single()

    if (error) {
      console.error('[SUPABASE] Error creating user:', error)
      return null
    }

    console.log('[SUPABASE] User created in Supabase:', userId)
    return newUser
  } catch (err) {
    console.error('[SUPABASE] Exception ensuring user:', err)
    return null
  }
}

/**
 * Save subscription upgrade/downgrade with full transaction details
 * Tracks: old plan, new plan, refund calculated, net amount charged
 */
export async function saveSubscriptionUpgrade(upgrade: {
  user_id: string  // UUID
  old_subscription_id: string
  new_subscription_id: string
  old_plan: string        // e.g., "starter_annual"
  new_plan: string        // e.g., "growth_annual"
  old_plan_price: number  // e.g., 120.00
  new_plan_price: number  // e.g., 240.00
  days_remaining: number  // e.g., 355
  total_days: number      // e.g., 365
  refund_calculated: number  // e.g., 116.44 (for audit only)
  net_charge: number      // e.g., 123.56 (what was actually charged)
  stripe_invoice_id?: string  // Invoice ID for the net charge
  upgrade_type: 'upgrade' | 'downgrade'
  upgraded_at: string     // ISO timestamp
}) {
  try {
    const { data, error } = await supabase
      .from('subscription_upgrades')
      .insert([upgrade])
      .select()

    if (error) {
      console.error('[SUPABASE] Error saving subscription upgrade:', error)
      return false
    }

    console.log('[SUPABASE] Subscription upgrade saved:', upgrade)
    return true
  } catch (err) {
    console.error('[SUPABASE] Exception saving subscription upgrade:', err)
    return false
  }
}

/**
 * Get subscription upgrades for a user (for billing history)
 */
export async function getSubscriptionUpgradesForUser(userUuid: string) {
  try {
    const { data, error } = await supabase
      .from('subscription_upgrades')
      .select('*')
      .eq('user_id', userUuid)
      .order('upgraded_at', { ascending: false })

    if (error && error.code !== 'PGRST116') {
      console.error('[SUPABASE] Error fetching subscription upgrades:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('[SUPABASE] Exception fetching subscription upgrades:', err)
    return []
  }
}

/**
 * Invoicing (transactions with type='INVOICE')
 */
export async function getInvoicesFromSupabase(userId: number, status?: string, fromDate?: string, toDate?: string) {
  if (!supabase) return []

  try {
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'INVOICE')
      .order('transaction_date', { ascending: false })

    if (fromDate) {
      query = query.gte('transaction_date', fromDate)
    }
    if (toDate) {
      query = query.lte('transaction_date', toDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching invoices:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return []
  }
}

export async function updateInvoiceStatusInSupabase(invoiceId: number, reconciliationStatus: string, sentDate?: string, sentToEmail?: string) {
  if (!supabase) return null

  try {
    const updateData: any = { reconciliation_status: reconciliationStatus }
    if (sentDate) updateData.sent_date = sentDate
    if (sentToEmail) updateData.sent_to_email = sentToEmail

    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', invoiceId)
      .eq('type', 'INVOICE')
      .select()
      .single()

    if (error) {
      console.error('Error updating invoice:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error updating invoice:', error)
    return null
  }
}
