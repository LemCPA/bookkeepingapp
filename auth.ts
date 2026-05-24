// Client-side authentication functions
// For server-side functions, see lib/auth-server.ts

/**
 * Get user from localStorage (client-side only)
 * This function is meant to be used in client components
 */
export function getStoredUser() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const userJson = localStorage.getItem('user')
    return userJson ? JSON.parse(userJson) : null
  } catch (error) {
    console.error('Error getting stored user:', error)
    return null
  }
}

/**
 * Get access token from localStorage (client-side only)
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return localStorage.getItem('accessToken')
  } catch (error) {
    console.error('Error getting access token:', error)
    return null
  }
}

/**
 * Get refresh token from localStorage (client-side only)
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return localStorage.getItem('refreshToken')
  } catch (error) {
    console.error('Error getting refresh token:', error)
    return null
  }
}

/**
 * Get session token from localStorage (backward compatibility)
 * @deprecated Use getAccessToken() instead
 */
export function getSessionToken(): string | null {
  return getAccessToken()
}

/**
 * Create a fetch function that automatically includes the JWT access token
 * and handles token refresh if needed
 */
export function createAuthenticatedFetch(accessToken?: string | null, refreshToken?: string | null) {
  let token = accessToken || getAccessToken()
  const refresh = refreshToken || getRefreshToken()

  return async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
    } as Record<string, string>

    // Only set Content-Type if body is not FormData (FormData sets its own)
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    let response = await fetch(url, {
      ...options,
      headers,
    })

    // If token expired (401), try to refresh it
    if (response.status === 401 && refresh) {
      try {
        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: refresh }),
        })

        if (refreshResponse.ok) {
          const { accessToken: newToken } = await refreshResponse.json()
          token = newToken
          localStorage.setItem('accessToken', newToken)

          // Retry original request with new token
          headers.Authorization = `Bearer ${newToken}`
          response = await fetch(url, {
            ...options,
            headers,
          })
        }
      } catch (error) {
        console.error('Error refreshing token:', error)
        // Clear auth and let request fail
        clearAuth()
      }
    }

    return response
  }
}

/**
 * Clear authentication data from localStorage
 */
export function clearAuth() {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.removeItem('user')
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('sessionToken') // backward compatibility
}

/**
 * Set authentication data in localStorage
 */
export function setAuth(user: any, accessToken: string, refreshToken?: string) {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem('user', JSON.stringify(user))
  localStorage.setItem('accessToken', accessToken)

  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken)
  }
}
