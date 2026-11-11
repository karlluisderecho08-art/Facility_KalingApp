'use client'

// Chats between this facility and the mothers whose bookings it is handling.
// One chat per booking, open only while the booking is in progress: once a
// booking is completed, declined or expired, the backend permanently deletes
// its chat for both sides, so it drops off this list.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, MessageCircle, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MessageThread, type ThreadMessage } from '@/components/message-thread'
import { CollectionMethodInfo } from '@/components/collection-method'
import { apiFetch } from '@/lib/api'
import { STATUS_LABELS, formatDateTime, isOpenBooking, type MilkBankRequest } from '@/lib/booking'
import { getBookingChat, sendBookingMessage, useBookingChatUnread } from '@/lib/booking-chat'

// How often an open chat checks for replies. Paused while the tab is hidden.
const POLL_MS = 5000

export default function BookingChatsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = Number(searchParams.get('booking')) || null

  const [bookings, setBookings] = useState<MilkBankRequest[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const { byRequest } = useBookingChatUnread(10000)

  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [chatOpen, setChatOpen] = useState(true)
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)

  const loadBookings = useCallback(async () => {
    try {
      const res = await apiFetch('/milkbank/requests/all/')
      if (!res.ok) throw new Error(`Failed to load bookings (${res.status})`)
      const all: MilkBankRequest[] = await res.json()
      setBookings(all.filter(isOpenBooking))
      setListError(null)
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load bookings')
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  const loadChat = useCallback(async (requestId: number) => {
    try {
      const data = await getBookingChat(requestId)
      setMessages(data.messages)
      setChatOpen(data.open)
      setChatError(null)
      window.dispatchEvent(new Event('kalingapp:booking-chat-read'))
    } catch (e) {
      setChatError(e instanceof Error ? e.message : 'Could not load this chat.')
    } finally {
      setChatLoading(false)
    }
  }, [])

  useEffect(() => {
    setMessages([])
    setChatOpen(true)
    setChatError(null)
    if (!selectedId) return
    setChatLoading(true)
    loadChat(selectedId)
    const timer = setInterval(() => {
      if (!document.hidden) loadChat(selectedId)
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [selectedId, loadChat])

  // Most unread first, then the soonest appointment.
  const query = searchTerm.trim().toLowerCase()
  const visible = useMemo(
    () =>
      bookings
        .filter(
          (b) =>
            !query || b.owner_name?.toLowerCase().includes(query) || b.owner_email.toLowerCase().includes(query)
        )
        .sort(
          (a, b) =>
            (byRequest[String(b.id)] ?? 0) - (byRequest[String(a.id)] ?? 0) ||
            a.preferred_date.localeCompare(b.preferred_date)
        ),
    [bookings, query, byRequest]
  )

  const selected = bookings.find((b) => b.id === selectedId) ?? null
  const select = (id: number) => router.replace(`/admin/booking-chats?booking=${id}`)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mother Chats</h1>
        <p className="text-muted-foreground mt-2">
          Talk with mothers about their bookings. Each chat is permanently deleted for both sides when the booking
          ends.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr] h-[calc(100vh-18rem)] min-h-[480px]">
        {/* Bookings */}
        <div className="flex flex-col min-h-0 glass bg-glass rounded-[18px] border border-glass-rim shadow-glass">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
            {listLoading ? (
              <div className="flex justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : listError ? (
              <p className="p-4 text-sm text-destructive">{listError}</p>
            ) : visible.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">
                {query ? 'No booking matches that search.' : 'No bookings in progress right now.'}
              </p>
            ) : (
              visible.map((b) => {
                const unread = byRequest[String(b.id)] ?? 0
                const active = b.id === selectedId
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => select(b.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
                      active ? 'bg-light-pink' : 'hover:bg-light-pink/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`truncate text-sm ${unread ? 'font-semibold' : 'font-medium'}`}>
                        {b.owner_name || b.owner_email}
                      </span>
                      {unread > 0 && (
                        <span className="ml-auto shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {b.request_type === 'DONOR' ? 'Donor' : 'Recipient'} · {b.stages[b.current_stage_index]} ·{' '}
                      {formatDateTime(b.preferred_date, b.preferred_time)}
                    </p>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Chat */}
        <div className="min-h-0 flex flex-col gap-4">
          {selectedId ? (
            <>
              {selected && (
                <div className="flex flex-wrap items-start gap-3">
                  <Badge variant={selected.request_type === 'DONOR' ? 'default' : 'secondary'}>
                    {selected.request_type === 'DONOR' ? 'Donor' : 'Recipient'}
                  </Badge>
                  <Badge variant="outline">{STATUS_LABELS[selected.current_sub_status]}</Badge>
                  {selected.request_type === 'DONOR' && (
                    <div className="basis-full">
                      <CollectionMethodInfo request={selected} />
                    </div>
                  )}
                </div>
              )}
              <div className="flex-1 min-h-[360px]">
                <MessageThread
                  title={selected ? selected.owner_name || selected.owner_email : `Booking #${selectedId}`}
                  subtitle="Private between this facility and the mother -- deleted when the booking ends"
                  messages={messages}
                  mySide="facility"
                  loading={chatLoading}
                  error={chatError}
                  emptyText="No messages yet. Send the mother a message about her booking."
                  closedNote={
                    chatOpen ? undefined : 'This booking has ended, so its chat was permanently deleted.'
                  }
                  onSend={async (body) => {
                    const sent = await sendBookingMessage(selectedId, body)
                    setMessages((current) => [...current, sent])
                  }}
                />
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground glass bg-glass rounded-[18px] border border-glass-rim shadow-glass">
              <MessageCircle className="h-8 w-8" />
              <p className="text-sm">Choose a booking to open its chat.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
