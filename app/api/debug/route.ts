import { NextRequest, NextResponse } from 'next/server'
import { getTransaction, getTransactions } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const allTransactions = getTransactions(1) // userId 1 for testing
    const transaction1 = getTransaction(1)
    
    return NextResponse.json({
      debug: {
        totalTransactions: allTransactions.length,
        transaction1Found: !!transaction1,
        transaction1Data: transaction1,
        allTransactionIds: allTransactions.map((t: any) => t.id)
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}