// lib/session-server.ts -- used only by the /api/session route handlers.
//
// The dashboard's own session: where the refresh token is kept.
//
// Signing in still goes straight from the browser to the backend (so the
// backend's per-visitor sign-in limit keeps seeing the real visitor). The
// refresh token that comes back is handed to /api/session and kept in an
// httpOnly cookie on THIS site, which no page script can read -- so a script
// injected into the page can't carry off a login that lasts all day. The page
// only ever holds the short-lived access token, in memory (lib/api.ts).
//
// The backend can't set this cookie itself: it lives on another site, and
// browsers increasingly refuse cross-site cookies (Safari already does).

import { NextResponse, type NextRequest } from 'next/server'

export const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

// Never kept longer than the backend's own refresh lifetime (1 day).
const MAX_SECONDS = 60 * 60 * 24
const JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/

function isHttps(req: NextRequest): boolean {
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '')
  return proto.split(',')[0].trim() === 'https'
}

/** `__Host-` (secure, whole site, this host only) wherever the site is served over HTTPS. */
export function sessionCookieName(req: NextRequest): string {
  return isHttps(req) ? '__Host-kalingapp-refresh' : 'kalingapp-refresh'
}

/**
 * Only this site's own pages may use these routes -- not a form or script on
 * another site trying to plant its own login here, or sign staff out.
 */
export function fromThisSite(req: NextRequest): boolean {
  const fetchSite = req.headers.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin') return false
  const origin = req.headers.get('origin')
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host.split(',')[0].trim()
  } catch {
    return false
  }
}

export function looksLikeToken(value: unknown): value is string {
  return typeof value === 'string' && value.length < 4096 && JWT.test(value)
}

/** Seconds until `token` expires (by its own `exp`), capped at a day; 0 if unreadable or past. */
export function secondsLeft(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
    const left = Math.floor(Number(payload.exp) - Date.now() / 1000)
    return Number.isFinite(left) ? Math.max(0, Math.min(MAX_SECONDS, left)) : 0
  } catch {
    return 0
  }
}

/** A JSON (or empty) answer nothing may cache. */
export function answer(body: unknown, status = 200): NextResponse {
  const headers = { 'Cache-Control': 'no-store' }
  return body === null ? new NextResponse(null, { status, headers }) : NextResponse.json(body, { status, headers })
}

export function keepSession(res: NextResponse, req: NextRequest, token: string): NextResponse {
  res.cookies.set(sessionCookieName(req), token, {
    httpOnly: true,
    secure: isHttps(req),
    sameSite: 'strict',
    path: '/',
    maxAge: secondsLeft(token),
  })
  return res
}

export function endSession(res: NextResponse, req: NextRequest): NextResponse {
  res.cookies.set(sessionCookieName(req), '', {
    httpOnly: true,
    secure: isHttps(req),
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
  return res
}

/** POST a JSON body to the backend from here; null when it couldn't be reached in time. */
export async function backendPost(path: string, body: unknown, timeoutMs: number): Promise<Response | null> {
  try {
    return await fetch(`${BACKEND_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    return null
  }
}
