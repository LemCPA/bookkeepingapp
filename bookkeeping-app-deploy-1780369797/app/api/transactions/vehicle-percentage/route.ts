import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getDb, saveDb } from '@/lib/db'

export async function PATCH(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { transactionId, businessUsePercentage } = await request.json()

    if (!transactionId || businessUsePercentage === undefined) {
      return NextResponse.json(
        { error: 'transactionId and businessUsePercentage are required' },
        { status: 400 }
      )
    }

    if (businessUsePercentage < 0 || businessUsePercentage > 100) {
      return NextResponse.json(
        { error: 'businessUsePercentage must be between 0 and 100' },
        { status: 400 }
      )
    }

    const db = getDb()
    const transaction = db.transactions.find(
      (t) => t.id === transactionId && t.user_id === userId && t.is_vehicle_expense
    )

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found or is not a vehicle expense' },
        { status: 404 }
      )
    }

    transaction.business_use_percentage = businessUsePercentage
    transaction.updated_at = new Date().toISOString()

    saveDb(db)

    return NextResponse.json({
      success: true,
      transaction,
    })
  } catch (error: any) {
    console.error('[UPDATE VEHICLE PERCENTAGE]', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update business use percentage' },
      { status: 500 }
    )
  }
}
