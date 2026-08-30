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
    throw new ApiError(res.status, 'Invalid email or password')
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
