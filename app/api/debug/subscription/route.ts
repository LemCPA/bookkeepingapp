import { NextRequest, NextResponse } from 'next/server'
import { getUserEmailFromRequest, getUserIdFromRequest } from '@/lib/auth-server'
import { emailToUuid, supabase, getSubscriptionFromSupabase } from '@/lib/supabase-db'

export async function GET(request: NextRequest) {
  try {
    const userEmail = getUserEmailFromRequest(request)
    const userId = getUserIdFromRequest(request)

    console.log('[DEBUG-SUB] userEmail:', userEmail)
    console.log('[DEBUG-SUB] userId:', userId)

    if (!userEmail && !userId) {
      return NextResponse.json({
        error: 'Not authenticated',
        info: 'Add Authorization: Bearer <token> header or ensure you are logged in'
      }, { status: 401 })
    }

    const email = userEmail || 'unknown'

    const userUuid = emailToUuid(email)
    console.log(`[DEBUG-SUB] Looking for subscriptions for email: ${email}, UUID: ${userUuid}`)

    // Get all subscriptions for this user (don't filter by status)
    const { data: allSubs, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userUuid)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[DEBUG-SUB] Error fetching subscriptions:', error)
      return NextResponse.json({ error: 'Failed to fetch subscriptions', details: error }, { status: 500 })
    }

    // Also show what getSubscriptionFromSupabase would return
    const validSubscription = await getSubscriptionFromSupabase(email)
    console.log('[DEBUG-SUB] Valid subscription result:', validSubscription)

    return NextResponse.json({
      email,
      userUuid,
      userId,
      subscriptionsFound: allSubs?.length || 0,
      allSubscriptions: allSubs || [],
      validSubscriptionReturned: validSubscription || null,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
