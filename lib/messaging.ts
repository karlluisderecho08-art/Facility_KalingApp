// lib/messaging.ts
//
// This facility's private conversation with the KalingApp admins. The
// backend works out which facility from the logged-in account, so nothing
// here ever names a facility id -- there is nothing a user could change to
// read another facility's thread.

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import type { ThreadMessage } from '@/components/message-thread'

const THREAD = '/messaging/facility/messages/'

async function errorFrom(res: Response, fallback: string) {
  if (res.status === 429) return new Error('You are sending messages too quickly. Please wait a moment.')
  try {
    const data = await res.json()
    const detail = data?.body?.[0] ?? data?.detail
    if (typeof detail === 'string') return new Error(detail)
  } catch {
    // not JSON
  }
  return new Error(fallback)
}

export async function getThread(): Promise<{ facility_name: string; messages: ThreadMessage[] }> {
  const res = await apiFetch(THREAD)
  if (!res.ok) throw await errorFrom(res, 'Could not load messages.')
  return res.json()
}

export async function sendMessage(body: string): Promise<ThreadMessage> {
  const res = await apiFetch(THREAD, { method: 'POST', body: JSON.stringify({ body }) })
  if (!res.ok) throw await errorFrom(res, 'Message could not be sent.')
  return res.json()
}

export async function clearThread(): Promise<void> {
  const res = await apiFetch(THREAD, { method: 'DELETE' })
  if (!res.ok) throw await errorFrom(res, 'Conversation could not be cleared.')
}

/** Unread messages from the admins, polled for the sidebar badge. */
export function useUnreadMessages(intervalMs = 20000) {
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (document.hidden) return
      try {
        const res = await apiFetch('/messaging/facility/unread/')
        if (res.ok && !cancelled) setUnread((await res.json()).unread ?? 0)
      } catch {
        // offline -- keep the last count
      }
    }
    load()
    const timer = setInterval(load, intervalMs)
    window.addEventListener('kalingapp:messages-read', load)
    return () => {
      cancelled = true
      clearInterval(timer)
      window.removeEventListener('kalingapp:messages-read', load)
    }
  }, [intervalMs])
  return unread
}
