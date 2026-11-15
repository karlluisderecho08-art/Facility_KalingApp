// lib/api.ts
//
// Everything for talking to the real KalingApp backend lives here: the
// base URL, token storage, login, and a fetch wrapper that attaches the
// Authorization header automatically. Nothing else in the app should
// call `fetch()` against the backend directly -- go through `apiFetch`
// so auth stays consistent everywhere.

const API_URL = process.env.NEXT_PUBLIC_API_URL

if (!API_URL) {
  // Fails loudly at build/runtime instead of silently calling undefined/undefined/...
  throw new Error(
    'NEXT_PUBLIC_API_URL is not set -- copy .env.local.example to .env.local and fill it in.'
  )
}

const ACCESS_TOKEN_KEY = 'kalingapp-facility-access'
const REFRESH_TOKEN_KEY = 'kalingapp-facility-refresh'

export interface BackendUser {
  id: number
  email: string
  role: 'mother' | 'facility_staff'
  // From UserSerializer: the facility this staff account runs, or null if
  // it hasn't been assigned one yet.
  facility_name?: string | null
  [key: string]: unknown
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function getTokens() {
  if (typeof window === 'undefined') return { access: null, refresh: null }
  return {
    access: window.localStorage.getItem(ACCESS_TOKEN_KEY),
    refresh: window.localStorage.getItem(REFRESH_TOKEN_KEY),
  }
}

function setTokens(access: string, refresh: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, access)
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}

function clearTokens() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.localStorage.removeItem(REFRESH_TOKEN_KEY)
}

/**
 * Logs in against POST /auth/login/, then fetches /auth/me/ to check the
 * account is actually facility_staff -- a mother account can authenticate
 * fine (same endpoint for everyone) but has no business in this dashboard.
 */
export async function login(email: string, password: string): Promise<BackendUser> {
  const res = await fetch(`${API_URL}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    throw new ApiError(res.status, await signInFailure(res))
  }

  const { access, refresh } = await res.json()
  setTokens(access, refresh)

  const me = await fetch(`${API_URL}/auth/me/`, {
    headers: { Authorization: `Bearer ${access}` },
  })
  const user: BackendUser = await me.json()

  if (user.role !== 'facility_staff') {
    clearTokens()
    throw new ApiError(403, 'This account is not a facility staff account.')
  }

  return user
}

/** "about 3 minutes", "about 2 hours" -- how long a sign-in lock has left. */
function aboutHowLong(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60))
  if (minutes === 1) return 'about a minute'
  if (minutes < 90) return `about ${minutes} minutes`
  const hours = Math.round(minutes / 60)
  return `about ${hours} hours`
}

/**
 * Why a sign-in was refused, in words staff can act on. Every refusal used to
 * read "Invalid email or password" -- including a locked account, so someone
 * locked out after too many wrong passwords was told to keep trying.
 */
async function signInFailure(res: Response): Promise<string> {
  if (res.status === 423) {
    const body = await res.json().catch(() => null)
    const wait = aboutHowLong(Number(body?.retry_after_seconds) || 0)
    return (
      `Too many wrong passwords, so this account is locked for ${wait}. ` +
      'Use "Forgot password?" to set a new one, or ask your KalingApp admin to unlock it.'
    )
  }
  if (res.status === 429) return 'Too many sign-in attempts. Wait a minute, then try again.'
  if (res.status === 400 || res.status === 401) return 'Invalid email or password'
  return 'Could not sign in right now. Please try again.'
}

/** Why the server refused a reset step, or a fallback. */
async function resetFailure(res: Response, fallback: string): Promise<string> {
  if (res.status === 429) return 'Too many tries. Wait a minute, then try again.'
  const body = await res.json().catch(() => null)
  return typeof body?.detail === 'string' ? body.detail : fallback
}

/**
 * Step 1 of "Forgot password?": POST /auth/forgot-password/ emails a 6-digit
 * code. The server answers the same whether or not the email has an account,
 * so this only throws when the request itself failed.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/forgot-password/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) throw new ApiError(res.status, await resetFailure(res, 'Could not send a code. Please try again.'))
}

/**
 * Step 2: POST /auth/reset-password/ with the emailed code. The server also
 * signs the account in, but those tokens are dropped on purpose -- staff sign
 * in again with the new password, through the same staff-only check as always.
 */
export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/reset-password/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, new_password: newPassword }),
  })
  if (!res.ok) throw new ApiError(res.status, await resetFailure(res, 'Could not change the password. Please try again.'))
}

export function logout() {
  clearTokens()
}

export function isLoggedIn() {
  return getTokens().access !== null
}

async function refreshAccessToken(): Promise<string | null> {
  const { refresh } = getTokens()
  if (!refresh) return null

  const res = await fetch(`${API_URL}/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  if (!res.ok) {
    clearTokens()
    return null
  }
  const { access } = await res.json()
  window.localStorage.setItem(ACCESS_TOKEN_KEY, access)
  return access
}

/**
 * Fetch wrapper for every other backend call. Attaches the access token,
 * and on a 401 (expired token) tries exactly one silent refresh + retry
 * before giving up -- avoids logging someone out just because their
 * access token (short-lived) expired mid-session.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const { access } = getTokens()

  const doFetch = (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })

  let res = await doFetch(access)

  if (res.status === 401) {
    const newAccess = await refreshAccessToken()
    if (newAccess) {
      res = await doFetch(newAccess)
    }
  }

  return res
}

export async function getMe(): Promise<BackendUser | null> {
  const { access } = getTokens()
  if (!access) return null

  const res = await apiFetch('/auth/me/')
  if (!res.ok) return null
  return res.json()
}
