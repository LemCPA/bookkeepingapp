import { NextRequest, NextResponse } from 'next/server'
import { getExpenseByCategoryData } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const startMonth = request.nextUrl.searchParams.get('startMonth')
    const endMonth = request.nextUrl.searchParams.get('endMonth')
    const categoriesParam = request.nextUrl.searchParams.get('categories')

    if (!startMonth || !endMonth) {
      return NextResponse.json(
        { error: 'startMonth and endMonth are required' },
        { status: 400 }
      )
    }

    // Parse selected categories (comma-separated IDs)
    const selectedCategories = categoriesParam
      ? categoriesParam.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id))
      : []

    const data = getExpenseByCategoryData(userId, startMonth, endMonth, selectedCategories)

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Expense categories report error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate expense categories report' },
      { status: 500 }
    )
  }
}
