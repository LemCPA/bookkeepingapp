import axios from 'axios'

/**
 * QBO OAuth Configuration
 * Get these from https://developer.intuit.com
 */
const QBO_CLIENT_ID = process.env.QBO_CLIENT_ID || ''
const QBO_CLIENT_SECRET = process.env.QBO_CLIENT_SECRET || ''
const QBO_REDIRECT_URI = process.env.QBO_REDIRECT_URI || 'http://localhost:3000/api/auth/qbo-callback'
const QBO_REALM_ID = process.env.QBO_REALM_ID || '' // Company ID

const QBO_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2'
const QBO_TOKEN_URL = 'https://quickbooks.api.intuit.com/oauth2/tokens'
const QBO_API_BASE = 'https://quickbooks.api.intuit.com/v2/company'

export interface QBOAccessToken {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  x_refresh_token_expires_in: number
  realm_id: string
}

/**
 * Generate QBO OAuth authorization URL for user to visit
 */
export function getQBOAuthorizationURL(state: string): string {
  const params = new URLSearchParams({
    client_id: QBO_CLIENT_ID,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    redirect_uri: QBO_REDIRECT_URI,
    state,
  })

  return `${QBO_AUTH_URL}?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<QBOAccessToken | null> {
  try {
    const response = await axios.post(QBO_TOKEN_URL, null, {
      params: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: QBO_REDIRECT_URI,
      },
      auth: {
        username: QBO_CLIENT_ID,
        password: QBO_CLIENT_SECRET,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    return response.data as QBOAccessToken
  } catch (error) {
    console.error('Error exchanging QBO code for token:', error)
    return null
  }
}

/**
 * Refresh an expired QBO access token
 */
export async function refreshQBOToken(refreshToken: string): Promise<QBOAccessToken | null> {
  try {
    const response = await axios.post(QBO_TOKEN_URL, null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      },
      auth: {
        username: QBO_CLIENT_ID,
        password: QBO_CLIENT_SECRET,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    return response.data as QBOAccessToken
  } catch (error) {
    console.error('Error refreshing QBO token:', error)
    return null
  }
}

/**
 * Make an authenticated API call to QBO
 */
export async function makeQBORequest(
  endpoint: string,
  accessToken: string,
  realmId: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any
): Promise<any> {
  try {
    const url = `${QBO_API_BASE}/${realmId}${endpoint}`

    const config = {
      method,
      url,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      (config as any).data = data
    }

    const response = await axios(config)
    return response.data
  } catch (error) {
    console.error('Error making QBO API request:', error)
    return null
  }
}

/**
 * Get QBO company info
 */
export async function getQBOCompanyInfo(accessToken: string, realmId: string): Promise<any> {
  return makeQBORequest('/companyinfo/' + realmId, accessToken, realmId)
}

/**
 * Get QBO customers
 */
export async function getQBOCustomers(accessToken: string, realmId: string): Promise<any[]> {
  const response = await makeQBORequest('/query', accessToken, realmId, 'GET')

  // QBO returns data in response.QueryResponse.Customer
  if (response?.QueryResponse?.Customer) {
    return response.QueryResponse.Customer
  }

  return []
}
