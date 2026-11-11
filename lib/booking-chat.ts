// lib/booking-chat.ts
//
// The chat between this facility and a mother about her booking. The
// backend only lets staff of the booking's own facility in, and only while
// the booking is open: the moment it is completed, declined or expired, the
// whole chat is permanently deleted for both sides.

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import type { ThreadMessage } from '@/components/message-thread'

export interface BookingChat {
  request_id: number
  /** False once the booking has ended -- the chat is gone and can't be written to. */
  open: boolean
  facility_name: string
  mother_name: string
  messages: ThreadMessage[]
}

const chatUrl = (requestId: number) => `/messaging/bookings/${requestId}/messages/`

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

export async function getBookingChat(requestId: number): Promise<BookingChat> {
  const res = await apiFetch(chatUrl(requestId))
  if (!res.ok) throw await errorFrom(res, 'Could not load this chat.')
  return res.json()
}

export async function sendBookingMessage(requestId: number, body: string): Promise<ThreadMessage> {
  const res = await apiFetch(chatUrl(requestId), { method: 'POST', body: JSON.stringify({ body }) })
  if (!res.ok) throw await errorFrom(res, 'Message could not be sent.')
  return res.json()
}

export interface BookingChatUnread {
  unread: number
  byRequest: Record<string, number>
}

/** Unread messages from mothers across this facility's open bookings, polled for badges. */
export function useBookingChatUnread(intervalMs = 20000): BookingChatUnread {
  const [state, setState] = useState<BookingChatUnread>({ unread: 0, byRequest: {} })
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (document.hidden) return
      try {
        const res = await apiFetch('/messaging/bookings/unread/')
        if (res.ok && !cancelled) {
          const data = await res.json()
          setState({ unread: data.unread ?? 0, byRequest: data.by_request ?? {} })
        }
      } catch {
        // offline -- keep the last counts
      }
    }
    load()
    const timer = setInterval(load, intervalMs)
    window.addEventListener('kalingapp:booking-chat-read', load)
    return () => {
      cancelled = true
      clearInterval(timer)
      window.removeEventListener('kalingapp:booking-chat-read', load)
    }
  }, [intervalMs])
  return state
}
