import type { NextRequest } from 'next/server'
import { answer, backendPost, endSession, fromThisSite, keepSession, looksLikeToken, sessionCookieName } from '@/lib/session-server'

// See lib/session-server.ts for what this session is and why it is kept here.
export const dynamic = 'force-dynamic'
// The backend can take half a minute to wake up on its free plan.
export const maxDuration = 60

/**
 * POST -- a fresh access token from the session cookie's refresh token.
 *
 *   200 {access}  signed in
 *   204           no session at all (never signed in here, or signed out)
 *   401           the session is over (expired, revoked, password changed):
 *                 the cookie is cleared, and the page signs out
 *   503           the backend couldn't answer just now (waking up, busy):
 *                 still signed in, try again later -- never a sign-out
 */
export async function POST(req: NextRequest) {
  if (!fromThisSite(req)) return answer({ detail: 'Not allowed.' }, 403)
  const token = req.cookies.get(sessionCookieName(req))?.value
  // Not signed in is an ordinary answer here, not an error -- the sign-in
  // page asks this on every visit.
  if (token === undefined) return answer(null, 204)
  if (!looksLikeToken(token)) return endSession(answer({ detail: 'Signed out.' }, 401), req)

  const res = await backendPost('/auth/refresh/', { refresh: token }, 55000)
  if (res && (res.status === 400 || res.status === 401)) return endSession(answer({ detail: 'Signed out.' }, 401), req)
  const data = res && res.ok ? await res.json().catch(() => null) : null
  if (!data || typeof data.access !== 'string') return answer({ detail: 'Could not reach the server.' }, 503)

  const out = answer({ access: data.access })
  // simplejwt hands back a new refresh token only when rotation is on.
  return looksLikeToken(data.refresh) ? keepSession(out, req, data.refresh) : out
}
