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
 */
const USER_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
export function numericIdToUuid(userId: number): string {
  return uuidv5(userId.toString(), USER_NAMESPACE)
}

/**
 * Get subscription for a user from Supabase
 * Returns the most recent subscription that is NOT canceled (includes active, past_due, trialing, etc.)
 */
export async function getSubscriptionFromSupabase(userId: number) {
  try {
    const userUuid = numericIdToUuid(userId)
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
      console.log(`[SUPABASE] Found subscription for user ${userId}: ${validSubscription.id} (status: ${validSubscription.status})`)
      return validSubscription
    }

    // If no valid subscription, check if there are any canceled ones (for logging)
    const canceledSubscription = data.find(sub => sub.status === 'canceled' || sub.status === 'incomplete_expired')
    if (canceledSubscription) {
      console.log(`[SUPABASE] Only canceled subscription found for user ${userId}`)
    }

    console.log(`[SUPABASE] No valid subscription found for user ${userId}`)
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
    // Use UPSERT to update-if-exists or insert-if-new (atomic operation)
    // This prevents race conditions and data loss from delete-then-insert
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert([subscription], {
        onConflict: 'stripe_subscription_id' // Use subscription ID as unique key
      })
      .select()

    if (error) {
      console.error('[SUPABASE] Error saving subscription:', error)
      return false
    }

    console.log('[SUPABASE] Subscription saved/updated:', data)
    return true
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
export async function updateUserStripeCustomerId(userId: number, stripeCustomerId: string) {
  try {
    const userUuid = numericIdToUuid(userId)
    console.log(`[SUPABASE] Updating stripe_customer_id for user ${userId} (UUID: ${userUuid})`)

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
    const userUuid = numericIdToUuid(userId)
    console.log(`[SUPABASE] Syncing user: ${userId} (${email}) → UUID: ${userUuid}`)

    // Upsert user (insert or update if exists)
    const { data, error } = await supabase
      .from('users')
      .upsert([{
        id: userUuid,
        email,
        name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }], { onConflict: 'id' })
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
