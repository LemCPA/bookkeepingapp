import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getPaymentMethods, createPaymentMethod, deletePaymentMethod, getUser } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get user ID from JWT token
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get payment methods from database
    const paymentMethods = getPaymentMethods(userId)

    return NextResponse.json({
      paymentMethods: paymentMethods.map(pm => ({
        id: pm.id,
        last4: pm.last4,
        brand: pm.brand.toUpperCase(),
        expMonth: pm.exp_month,
        expYear: pm.exp_year,
        isDefault: pm.is_default,
        createdAt: pm.created_at,
      })),
    })
  } catch (error) {
    console.error('Get payment methods error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get payment methods',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user ID from JWT token
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user
    const user = getUser(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { last4, brand, expMonth, expYear, isDefault } = body

    if (!last4 || !brand) {
      return NextResponse.json(
        { error: 'Last 4 digits and brand are required' },
        { status: 400 }
      )
    }

    // Store payment method in database
    const result = createPaymentMethod(
      userId,
      `pm_${Date.now()}`,
      last4,
      brand,
      expMonth || 0,
      expYear || 0,
      isDefault || false
    )

    return NextResponse.json({
      paymentMethod: {
        id: result.lastID,
        last4,
        brand,
        expMonth,
        expYear,
        isDefault: isDefault || false,
      },
      message: 'Payment method added successfully',
    })
  } catch (error) {
    console.error('Add payment method error:', error)
    return NextResponse.json(
      {
        error: 'Failed to add payment method',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get user ID from JWT token
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get payment method ID from query params
    const { searchParams } = new URL(request.url)
    const paymentMethodId = searchParams.get('id')

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      )
    }

    // Parse ID as number for database lookup
    const id = parseInt(paymentMethodId, 10)

    // Verify payment method belongs to user
    const paymentMethods = getPaymentMethods(userId)
    const paymentMethod = paymentMethods.find(pm => pm.id === id)

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      )
    }

    // Delete from Helcim first
    try {
      await deleteHelcimPaymentMethod(paymentMethod.helcim_payment_method_id)
    } catch (helcimError) {
      console.error('Error deleting payment method from Helcim:', helcimError)
      // Continue with local deletion even if Helcim fails
    }

    // Delete from database
    const deleted = deletePaymentMethod(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete payment method' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Payment method deleted successfully' })
  } catch (error) {
    console.error('Delete payment method error:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete payment method',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
