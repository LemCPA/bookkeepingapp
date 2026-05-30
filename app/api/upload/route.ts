import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { createDocument, getTransaction } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { isDemoAccount, checkDemoRateLimit } from '@/lib/demo-security'
import { logDemoActivity } from '@/lib/demo-audit'

export async function POST(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Demo account security checks
    if (isDemoAccount(userId)) {
      logDemoActivity({
        operation: 'UPLOAD_DOCUMENT_BLOCKED',
        method: 'POST',
        endpoint: request.nextUrl.pathname,
        status: 403,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Demo account cannot upload documents. Sign up for a free account to use all features.' },
        { status: 403 }
      )
    }

    // Rate limiting check
    if (!checkDemoRateLimit(`${userId}`)) {
      logDemoActivity({
        operation: 'RATE_LIMIT_EXCEEDED',
        method: 'POST',
        endpoint: request.nextUrl.pathname,
        status: 429,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const transactionId = formData.get('transactionId') as string

    if (!file || !transactionId) {
      return NextResponse.json(
        { error: 'File and transactionId are required' },
        { status: 400 }
      )
    }

    // Verify user owns the transaction
    const transaction = getTransaction(parseInt(transactionId))
    if (!transaction || transaction.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const buffer = await file.arrayBuffer()
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', transactionId)

    try {
      mkdirSync(uploadDir, { recursive: true })
    } catch (e) {
      // Directory might already exist
    }

    // Generate filename with timestamp
    const timestamp = Date.now()
    // Use original filename or fallback to type-based name
    const originalName = file.name || `receipt-${timestamp}`
    const fileName = `${timestamp}-${originalName}`
    const filePath = path.join(uploadDir, fileName)
    const relativeFilePath = `/uploads/${transactionId}/${fileName}`

    // Write compressed or original file
    writeFileSync(filePath, new Uint8Array(buffer))

    // Get actual stored file size (may differ from original if compressed)
    const actualSize = new Uint8Array(buffer).length

    createDocument(
      parseInt(transactionId),
      file.name,
      relativeFilePath,
      actualSize
    )

    return NextResponse.json({
      path: relativeFilePath,
      size: actualSize,
      originalSize: file.size,
      compressed: actualSize < file.size,
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 })
  }
}
