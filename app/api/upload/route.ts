import { NextRequest, NextResponse } from 'next/server'
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
    const timestamp = Date.now()
    const originalName = file.name || `receipt-${timestamp}`
    const fileName = `${timestamp}-${originalName}`
    const storagePath = `receipts/${userId}/${transactionId}/${fileName}`

    // Try Supabase Storage first (production)
    if (supabase !== null && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        console.log('Attempting Supabase upload to bucket: T2125, path:', storagePath)

        const { error: uploadError } = await supabase.storage
          .from('T2125')
          .upload(storagePath, new Uint8Array(buffer), {
            contentType: file.type,
            upsert: false,
          })

        if (uploadError) {
          console.error('Supabase storage upload error:', uploadError)
          // Log more details for debugging
          console.error('Error status:', uploadError.status, 'Message:', uploadError.message)
          throw new Error(`Supabase upload failed: ${uploadError.message}`)
        }

        console.log('Supabase upload successful')
        const actualSize = new Uint8Array(buffer).length

        createDocument(
          parseInt(transactionId),
          file.name,
          storagePath,
          actualSize
        )

        return NextResponse.json({
          path: storagePath,
          size: actualSize,
          originalSize: file.size,
          storage: 'supabase',
        })
      } catch (supabaseError: any) {
        console.error('Supabase upload failed:', {
          error: supabaseError?.message,
          status: supabaseError?.status,
          details: supabaseError?.toString(),
        })
        console.error('Stack:', supabaseError?.stack)
        return NextResponse.json(
          { error: 'File upload failed. Please try again.' },
          { status: 500 }
        )
      }
    } else {
      console.log('Supabase not configured - file uploads require Supabase setup')
      return NextResponse.json(
        { error: 'File storage is not configured for this deployment' },
        { status: 503 }
      )
    }
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 })
  }
}
