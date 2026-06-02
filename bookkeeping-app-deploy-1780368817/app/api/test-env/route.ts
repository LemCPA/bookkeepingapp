import { NextRequest, NextResponse } from 'next/server'
import { updateTransaction, getTransaction } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const diagnostics: any = {
      tests: []
    }

    // Test 1: Direct updateTransaction call
    console.log('Test 1: Direct updateTransaction call')
    const test1Success = updateTransaction(1, 1, "2026-05-17", 200)
    const test1Check = getTransaction(1)
    diagnostics.tests.push({
      name: "Direct updateTransaction(1, 1, '2026-05-17', 200)",
      success: test1Success,
      amount: test1Check?.amount,
      expectedAmount: 200
    })

    // Test 2: Try with all parameters
    console.log('Test 2: With all parameters')
    const test2Success = updateTransaction(
      1,
      1,
      "2026-05-17",
      250,
      "Lucky"
    )
    const test2Check = getTransaction(1)
    diagnostics.tests.push({
      name: "updateTransaction with basic parameters",
      success: test2Success,
      amount: test2Check?.amount,
      expectedAmount: 250
    })

    // Test 3: Check if transaction exists first
    console.log('Test 3: Check transaction 1 exists')
    const txn = getTransaction(1)
    diagnostics.tests.push({
      name: "getTransaction(1)",
      found: !!txn,
      id: txn?.id,
      amount: txn?.amount
    })

    // Test 4: Try updating with only amount parameter
    console.log('Test 4: Only amount parameter')
    const test4Success = updateTransaction(1, undefined, undefined, 300)
    const test4Check = getTransaction(1)
    diagnostics.tests.push({
      name: "updateTransaction(1, undefined, undefined, 300)",
      success: test4Success,
      amount: test4Check?.amount,
      expectedAmount: 300
    })

    diagnostics.finalTransaction = test4Check
    diagnostics.summary = `All tests completed. Final amount: ${test4Check?.amount}`

    return NextResponse.json(diagnostics)
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
