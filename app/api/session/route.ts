import type { NextRequest } from 'next/server'
import {
  answer,
  backendPost,
  endSession,
  fromThisSite,
  keepSession,
  looksLikeToken,
  secondsLeft,
  sessionCookieName,
} from '@/lib/session-server'

// See lib/session-server.ts for what this session is and why it is kept here.
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/** POST {refresh} -- keep a just-issued refresh token in this site's httpOnly session cookie. */
export async function POST(req: NextRequest) {
  if (!fromThisSite(req)) return answer({ detail: 'Not allowed.' }, 403)
  if (!(req.headers.get('content-type') ?? '').includes('application/json')) {
    return answer({ detail: 'Expected JSON.' }, 415)
  }
  const body = await req.json().catch(() => null)
  const token = body?.refresh
  if (!looksLikeToken(token) || secondsLeft(token) === 0) return answer({ detail: 'Not a usable session.' }, 400)
  return keepSession(answer(null, 204), req, token)
}

/**
 * DELETE -- sign out: the refresh token is revoked on the backend
 * (/auth/logout/), so even a copy of it can't be used again, then forgotten here.
 */
export async function DELETE(req: NextRequest) {
  if (!fromThisSite(req)) return answer({ detail: 'Not allowed.' }, 403)
  const token = req.cookies.get(sessionCookieName(req))?.value
  if (looksLikeToken(token)) await backendPost('/auth/logout/', { refresh: token }, 8000)
  return endSession(answer(null, 204), req)
}
