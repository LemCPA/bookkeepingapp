import { NextRequest, NextResponse } from 'next/server'
import { comparePassword } from '@/lib/bcrypt-utils'
import { createJWTToken, createRefreshToken } from '@/lib/jwt-utils'
import { getUserByEmail } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Lookup user in database (try Supabase first, then JSON)
    let user = await getUserByEmailFromSupabase(email)
    if (!user) {
      user = getUserByEmail(email)
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Validate password with bcrypt
    const isPasswordValid = await comparePassword(password, user.password_hash)
    if (!isPasswordValid) {
      // For backward compatibility, also check plain text (for existing demo user)
      if (user.password_hash !== password) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }
    }

    // Generate JWT tokens
    const accessToken = createJWTToken(user.id, user.email)
    const refreshToken = createRefreshToken(user.id)

    // Return user data without password
    const { password_hash, ...userWithoutPassword } = user as any
    return NextResponse.json(
      {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
