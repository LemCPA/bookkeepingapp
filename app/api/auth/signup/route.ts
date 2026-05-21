import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, isValidPassword } from '@/lib/bcrypt-utils'
import { createJWTToken, createRefreshToken } from '@/lib/jwt-utils'
import { getDb, saveDb, getUserByEmail } from '@/lib/db'
import { getUserByEmailFromSupabase, createUserInSupabase } from '@/lib/supabase-db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    const passwordValidation = isValidPassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', details: passwordValidation.errors },
        { status: 400 }
      )
    }

    // Check if user already exists (try Supabase first, then JSON)
    let existingUser = await getUserByEmailFromSupabase(email)
    if (!existingUser) {
      existingUser = getUserByEmail(email)
    }
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Try to create user in Supabase first
    let newUser = await createUserInSupabase(email, passwordHash, name)

    // If Supabase is not available, fall back to JSON
    if (!newUser) {
      const db = getDb()
      const userId = db.nextUserId++
      newUser = {
        id: userId,
        email,
        password_hash: passwordHash,
        name,
        email_verified: true, // In production, set to false and send verification email
        gst_registered: false,
        created_at: new Date().toISOString(),
      }
      db.users.push(newUser)
      saveDb(db)
    }

    // Generate tokens (use ID for JWT)
    const userId = newUser.id
    const accessToken = createJWTToken(userId, email)
    const refreshToken = createRefreshToken(userId)

    // Return user data without password
    const { password_hash, ...userWithoutPassword } = newUser as any
    return NextResponse.json({
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    }, { status: 201 })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
