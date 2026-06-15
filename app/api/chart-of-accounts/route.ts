import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getChartOfAccountsFromSupabase } from '@/lib/supabase-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch accounts from Supabase (cloud storage, not local ephemeral database)
    const accounts = await getChartOfAccountsFromSupabase()
    return NextResponse.json(accounts)
  } catch (error: any) {
    console.error('Error fetching chart of accounts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch chart of accounts' },
      { status: 500 }
    )
  }
}
