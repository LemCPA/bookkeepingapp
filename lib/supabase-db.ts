import { createClient } from '@supabase/supabase-js'

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
 * Get subscription for a user from Supabase
 */
export async function getSubscriptionFromSupabase(userId: number) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[SUPABASE] Error fetching subscription:', error)
      return null
    }

    return data || null
  } catch (err) {
    console.error('[SUPABASE] Exception fetching subscription:', err)
    return null
  }
}

/**
 * Save subscription to Supabase
 */
export async function saveSubscriptionToSupabase(subscription: {
  user_id: number
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
    // First, delete any existing subscription for this user
    await supabase.from('subscriptions').delete().eq('user_id', subscription.user_id)

    // Then insert the new one
    const { data, error } = await supabase
      .from('subscriptions')
      .insert([subscription])
      .select()

    if (error) {
      console.error('[SUPABASE] Error saving subscription:', error)
      return false
    }

    console.log('[SUPABASE] Subscription saved:', data)
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
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
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
    const { data, error } = await supabase
      .from('users')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', userId)
      .select()

    if (error) {
      console.error('[SUPABASE] Error updating user stripe_customer_id:', error)
      return false
    }

    console.log('[SUPABASE] User stripe_customer_id updated:', data)
    return true
  } catch (err) {
    console.error('[SUPABASE] Exception updating user:', err)
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
