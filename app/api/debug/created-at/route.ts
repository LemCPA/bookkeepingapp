import { NextRequest, NextResponse } from 'next/server'
import { getUserEmailFromRequest } from '@/lib/auth-server'
import { emailToUuid, supabase } from '@/lib/supabase-db'

export async function GET(request: NextRequest) {
  try {
    const userEmail = getUserEmailFromRequest(request)
    if (!userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userUuid = emailToUuid(userEmail)
    const { data: user } = await supabase
      .from('users')
      .select('id, email, created_at')
      .eq('id', userUuid)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const createdAt = new Date(user.created_at)
    const now = new Date()
    const daysOld = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    const daysRemaining = 7 - daysOld

    return NextResponse.json({
      email: user.email,
      created_at: user.created_at,
      created_at_date: createdAt.toISOString(),
      now: now.toISOString(),
      days_old: daysOld,
      days_remaining: daysRemaining,
      is_expired: daysRemaining <= 0,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
