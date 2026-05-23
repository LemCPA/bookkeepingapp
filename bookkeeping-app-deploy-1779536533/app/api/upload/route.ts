import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { createDocument, getTransaction } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    const fileName = `${Date.now()}-${file.name}`
    const filePath = path.join(uploadDir, fileName)
    const relativeFilePath = `/uploads/${transactionId}/${fileName}`

    writeFileSync(filePath, new Uint8Array(buffer))

    createDocument(
      parseInt(transactionId),
      file.name,
      relativeFilePath,
      file.size
    )

    return NextResponse.json({
      path: relativeFilePath,
      size: file.size,
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 })
  }
}
