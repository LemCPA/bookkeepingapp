import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'

function usersToCSV(users: any[]): string {
  if (users.length === 0) {
    return 'ID,Email,Name,GST Registered,GST Number,Created At'
  }

  const headers = ['ID', 'Email', 'Name', 'GST Registered', 'GST Number', 'Created At']

  const rows = users.map(u => [
    u.id,
    u.email || '',
    `"${(u.name || '').replace(/"/g, '""')}"`,
    u.gst_registered ? 'Yes' : 'No',
    u.gst_number || '',
    u.created_at,
  ].join(','))

  return [headers.join(','), ...rows].join('\n')
}

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()

    // Get only the current user's information (not other users for privacy)
    const currentUser = db.users?.find(u => u.id === userId)
    const userDataToExport = currentUser ? [currentUser] : []

    const csv = usersToCSV(userDataToExport)

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="user-profile-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('User export error:', error)
    return NextResponse.json({ error: error.message || 'Failed to export user data' }, { status: 500 })
  }
}
