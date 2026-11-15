// lib/api.ts
//
// Everything for talking to the real KalingApp backend lives here: the
// base URL, the session, login, and a fetch wrapper that attaches the
// Authorization header automatically. Nothing else in the app should
// call `fetch()` against the backend directly -- go through `apiFetch`
// so auth stays consistent everywhere.
//
// Where the tokens are. The refresh token (a day-long login) is kept in an
// httpOnly cookie on this site by the /api/session routes -- no page script
// can read it (see lib/session-server.ts). The access token lives only in
// this module's memory and lasts minutes. Both used to sit in localStorage,
// where any script that got into the page could read them and keep the login.

const API_URL = process.env.NEXT_PUBLIC_API_URL

if (!API_URL) {
  // Fails loudly at build/runtime instead of silently calling undefined/undefined/...
  throw new Error(
    'NEXT_PUBLIC_API_URL is not set -- copy .env.local.example to .env.local and fill it in.'
  )
}

// Where both tokens were kept before the session cookie. Read once, to carry
// an existing login over, then removed.
const LEGACY_ACCESS_KEY = 'kalingapp-facility-access'
const LEGACY_REFRESH_KEY = 'kalingapp-facility-refresh'

/** Fired on window when the session turns out to be over, so the app can show sign-in. */
export const SIGNED_OUT_EVENT = 'kalingapp:signed-out'

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

let accessToken: string | null = null
let refreshing: Promise<string | null> | null = null
let legacyChecked = false

/** Keep a refresh token in this site's httpOnly session cookie. */
async function keepSession(refresh: string): Promise<boolean> {
  try {
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
      cache: 'no-store',
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Carries a login made before the session cookie existed over to it, once,
 * and removes both tokens from localStorage either way.
 */
async function adoptLegacySession() {
  if (legacyChecked || typeof window === 'undefined') return
  legacyChecked = true
  let refresh: string | null = null
  try {
    refresh = window.localStorage.getItem(LEGACY_REFRESH_KEY)
    window.localStorage.removeItem(LEGACY_ACCESS_KEY)
    window.localStorage.removeItem(LEGACY_REFRESH_KEY)
  } catch {
    return
  }
  if (refresh) await keepSession(refresh)
}

/**
 * A fresh access token from the session cookie. null when there isn't one
 * right now -- either the session is over (then SIGNED_OUT_EVENT fires) or
 * the server couldn't answer (still signed in; the next call tries again).
 * Calls made at the same moment share one refresh.
 */
function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch('/api/session/refresh', { method: 'POST', cache: 'no-store' })
        if (res.status === 204 || res.status === 401) {
          accessToken = null
          window.dispatchEvent(new Event(SIGNED_OUT_EVENT))
          return null
        }
        if (!res.ok) return null
        const data = await res.json()
        accessToken = typeof data?.access === 'string' ? data.access : null
        return accessToken
      } catch {
        return null
      } finally {
        refreshing = null
      }
    })()
  }
  return refreshing
}

/**
 * Logs in against POST /auth/login/ -- straight to the backend, so its
 * per-visitor sign-in limit counts this visitor -- then fetches /auth/me/ to
 * check the account is actually facility_staff: a mother account can
 * authenticate fine (same endpoint for everyone) but has no business in this
 * dashboard.
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

  const me = await fetch(`${API_URL}/auth/me/`, {
    headers: { Authorization: `Bearer ${access}` },
  })
  const user: BackendUser = await me.json()

  if (user.role !== 'facility_staff') {
    // Not an account for this dashboard: revoke the login it was just given.
    fetch(`${API_URL}/auth/logout/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    }).catch(() => {})
    throw new ApiError(403, 'This account is not a facility staff account.')
  }

  if (!(await keepSession(refresh))) {
    throw new ApiError(500, 'Could not start your session. Please try again.')
  }
  accessToken = access
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

/** Signs out here and on the server: the session's refresh token is revoked, then forgotten. */
export async function logout() {
  accessToken = null
  try {
    await fetch('/api/session', { method: 'DELETE', cache: 'no-store' })
  } catch {
    // Offline: the cookie runs out on its own within a day.
  }
  try {
    window.localStorage.removeItem(LEGACY_ACCESS_KEY)
    window.localStorage.removeItem(LEGACY_REFRESH_KEY)
  } catch {
    // Storage unavailable: nothing was kept there.
  }
}

/**
 * Fetch wrapper for every other backend call. Attaches the access token
 * (getting one from the session first if this page doesn't have one yet),
 * and on a 401 (the token ran out) tries exactly one silent refresh + retry
 * before giving up -- avoids logging someone out just because their
 * access token (short-lived) expired mid-session.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const doFetch = (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })

  const token = accessToken ?? (await refreshAccessToken())
  let res = await doFetch(token)

  if (res.status === 401 && token) {
    const fresh = await refreshAccessToken()
    if (fresh) {
      res = await doFetch(fresh)
    }
  }

  return res
}

/** The signed-in account, or null when there is no session. Run once when the app starts. */
export async function getMe(): Promise<BackendUser | null> {
  await adoptLegacySession()
  if (!accessToken && !(await refreshAccessToken())) return null
  const res = await apiFetch('/auth/me/')
  if (!res.ok) return null
  return res.json()
}
