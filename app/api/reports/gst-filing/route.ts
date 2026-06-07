import { NextRequest, NextResponse } from 'next/server'
import { getGstFilingData, getDb } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const authHeader = request.headers.get('Authorization')
    console.log('GST Filing API - Auth Header:', authHeader ? 'Present' : 'Missing')

    const userId = getUserIdFromRequest(request)
    console.log('GST Filing API - User ID:', userId)

    if (!userId) {
      console.log('GST Filing API - Returning 401 Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const startMonth = searchParams.get('startMonth')
    const endMonth = searchParams.get('endMonth')

    // Get base GST filing data
    const data = getGstFilingData(userId, startMonth || undefined, endMonth || undefined)

    if (!data) {
      return NextResponse.json(
        { error: 'User not found or not GST registered' },
        { status: 404 }
      )
    }

    // Fetch business use percentages from Supabase
    const percentages = { homePercentage: 100, vehiclePercentage: 100 } // TODO: implement
    const homeUsePercentage = percentages?.home_business_use_percentage ?? 100
    const vehicleUsePercentage = percentages?.vehicle_business_use_percentage ?? 100

    // Calculate ITCs based on home and vehicle GST with percentages
    const db = getDb()
    let homeGstTotal = 0
    let vehicleGstTotal = 0

    // Get relevant transactions within date range
    let relevantTransactions = db.transactions.filter(t => t.user_id === userId)
    if (startMonth || endMonth) {
      const start = startMonth ? new Date(startMonth + '-01') : new Date('1900-01-01')
      const end = endMonth ? new Date(endMonth + '-31') : new Date('2099-12-31')
      relevantTransactions = relevantTransactions.filter(t => {
        const txDate = new Date(t.transaction_date)
        return txDate >= start && txDate <= end
      })
    }

    // Get accounts to identify home and vehicle expenses
    const homeAccountIds = new Set(
      db.chart_of_accounts
        .filter(a => a.user_id === userId && a.code && a.code.startsWith('9945'))
        .map(a => a.id)
    )
    const vehicleAccountIds = new Set(
      db.chart_of_accounts
        .filter(a => a.user_id === userId && a.code && a.code.startsWith('9281'))
        .map(a => a.id)
    )

    // Calculate GST amounts by type
    relevantTransactions.forEach(t => {
      if (t.account_id && homeAccountIds.has(t.account_id)) {
        homeGstTotal += t.gst_hst_amount || 0
      } else if (t.is_vehicle_expense || (t.account_id && vehicleAccountIds.has(t.account_id))) {
        vehicleGstTotal += t.gst_hst_amount || 0
      }
    })

    // Calculate claimable ITCs (apply business use percentages)
    const homeITC = homeGstTotal * (homeUsePercentage / 100)
    const vehicleITC = vehicleGstTotal * (vehicleUsePercentage / 100)
    const totalITC = homeITC + vehicleITC

    // Recalculate net GST with proper ITC handling
    // Net GST = GST Collected - (All GST Paid - Non-Deductible GST + Claimable ITC)
    // Simplified: Net GST = GST Collected - (Direct ITCs) - ((1 - home%) × homeGST) - ((1 - vehicle%) × vehicleGST)
    const nonDeductibleHomeGst = homeGstTotal * ((100 - homeUsePercentage) / 100)
    const nonDeductibleVehicleGst = vehicleGstTotal * ((100 - vehicleUsePercentage) / 100)
    const directGstPaidITC = data.gstPaid - homeGstTotal - vehicleGstTotal

    const correctedGstPaid = directGstPaidITC + totalITC
    const correctedNetGst = data.gstCollected - correctedGstPaid

    return NextResponse.json({
      ...data,
      netGst: correctedNetGst,
      gstPaid: correctedGstPaid,
      owingOrRefundable: correctedNetGst > 0 ? 'Owing' : 'Refundable',
      amount: Math.abs(correctedNetGst),
      homeUsePercentage,
      vehicleUsePercentage,
      homeITC,
      vehicleITC,
      totalITC,
    })
  } catch (error: any) {
    console.error('Error fetching GST filing data:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch GST filing data' },
      { status: 500 }
    )
  }
}
