import { NextRequest, NextResponse } from 'next/server'
import { getChartOfAccounts, createAccount, updateAccount, deleteAccount } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accounts = getChartOfAccounts(userId)
    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Error fetching chart of accounts:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { code, name, type } = body

    if (!code || !name || !type) {
      return NextResponse.json(
        { error: 'code, name, and type are required' },
        { status: 400 }
      )
    }

    const result = createAccount(code, name, type, userId)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Create account error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, code, name, type } = body

    if (!id || !code || !name || !type) {
      return NextResponse.json(
        { error: 'id, code, name, and type are required' },
        { status: 400 }
      )
    }

    updateAccount(id, code, name, type, userId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Update account error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update account' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    deleteAccount(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete account error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: 500 }
    )
  }
}
