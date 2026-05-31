/**
 * Supabase Database Abstraction Layer
 * Bridges between the existing JSON-based code and PostgreSQL via Supabase
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_SECRET || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

console.log('[SUPABASE] URL configured:', !!supabaseUrl, 'Key configured:', !!supabaseKey)
if (supabaseUrl) {
  console.log('[SUPABASE] URL:', supabaseUrl.substring(0, 30) + '...')
}

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not configured. Using JSON fallback.')
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

/**
 * User Management
 */
export async function getUserByEmailFromSupabase(email: string) {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error) return null
    return data
  } catch (error) {
    console.error('Error fetching user by email:', error)
    return null
  }
}

export async function getUserFromSupabase(id: number) {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return null
    return data
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}

export async function createUserInSupabase(
  email: string,
  password_hash: string,
  name: string,
  gstRegistered: boolean = false,
  gstNumber?: string
) {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          name,
          password_hash,
          gst_registered: gstRegistered,
          gst_number: gstNumber,
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return null
    }
    return data
  } catch (error) {
    console.error('Error creating user:', error)
    return null
  }
}

/**
 * Transactions
 */
export async function getTransactionsFromSupabase(userId: number, limit: number = 100) {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .limit(limit)

    if (error) return []
    return data || []
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return []
  }
}

export async function createTransactionInSupabase(
  userId: number,
  clientId: number,
  accountId: number,
  transactionDate: string,
  amount: number,
  gstHstRate: number,
  gstHstAmount: number,
  description: string,
  type: string,
  referenceNumber?: string
) {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          user_id: userId,
          client_id: clientId,
          account_id: accountId,
          transaction_date: transactionDate,
          amount,
          gst_hst_rate: gstHstRate,
          gst_hst_amount: gstHstAmount,
          description,
          type,
          reference_number: referenceNumber,
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating transaction:', error)
      return null
    }
    return data
  } catch (error) {
    console.error('Error creating transaction:', error)
    return null
  }
}

/**
 * Chart of Accounts
 */
export async function getChartOfAccountsFromSupabase(userId: number) {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('code', { ascending: true })

    if (error) return []
    return data || []
  } catch (error) {
    console.error('Error fetching chart of accounts:', error)
    return []
  }
}

export async function createAccountInSupabase(
  code: string,
  name: string,
  type: string,
  userId: number
) {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .insert([
        {
          code,
          name,
          type,
          user_id: userId,
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating account:', error)
      return null
    }
    return data
  } catch (error) {
    console.error('Error creating account:', error)
    return null
  }
}

/**
 * Clients
 */
export async function getClientsFromSupabase(userId: number) {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true })

    if (error) return []
    return data || []
  } catch (error) {
    console.error('Error fetching clients:', error)
    return []
  }
}

/**
 * Documents
 */
export async function getDocumentsByTransactionFromSupabase(transactionId: number) {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('transaction_id', transactionId)

    if (error) return []
    return data || []
  } catch (error) {
    console.error('Error fetching documents:', error)
    return []
  }
}

export async function createDocumentInSupabase(
  transactionId: number,
  fileName: string,
  filePath: string,
  fileSize: number,
  userId: number
) {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('documents')
      .insert([
        {
          transaction_id: transactionId,
          file_name: fileName,
          file_path: filePath,
          file_size: fileSize,
          user_id: userId,
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating document:', error)
      return null
    }
    return data
  } catch (error) {
    console.error('Error creating document:', error)
    return null
  }
}

/**
 * Subscriptions
 */
export async function createSubscriptionInSupabase(
  userId: number,
  planId: string,
  trialEndDate: string,
  status: string = 'trialing'
) {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert([
        {
          user_id: userId,
          plan_id: planId,
          trial_end_date: trialEndDate,
          status,
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating subscription:', error)
      return null
    }
    return data
  } catch (error) {
    console.error('Error creating subscription:', error)
    return null
  }
}

export async function getSubscriptionFromSupabase(userId: number) {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) return null
    return data
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return null
  }
}
