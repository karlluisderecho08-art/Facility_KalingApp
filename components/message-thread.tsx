'use client'

// The conversation pane shared by the facility and admin dashboards (each app
// keeps its own copy -- they are separate projects). It only draws a thread
// and reports what the user did; which endpoint that hits is the caller's job.
//
// Message bodies are rendered as plain React text, never as HTML: whatever the
// other side typed -- including "<script>" -- shows up as the characters typed.

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2, Lock, Send, Trash2 } from 'lucide-react'

export interface ThreadMessage {
  id: number
  side: 'facility' | 'admin'
  body: string
  created_at: string
  sender_name: string
}

export const MAX_MESSAGE_LENGTH = 2000

interface MessageThreadProps {
  title: string
  subtitle?: string
  messages: ThreadMessage[]
  /** Which side the viewer is on -- their own messages go on the right. */
  mySide: 'facility' | 'admin'
  loading?: boolean
  error?: string | null
  onSend: (body: string) => Promise<void>
  onClear: () => Promise<void>
}

function formatTime(iso: string) {
  const date = new Date(iso)
  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()
  return sameDay
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function MessageThread({
  title,
  subtitle,
  messages,
  mySide,
  loading = false,
  error = null,
  onSend,
  onClear,
}: MessageThreadProps) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Follow new messages down, but only when one actually arrives -- not on
  // every poll that comes back with the same thread.
  const lastId = messages.length ? messages[messages.length - 1].id : null
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [lastId])

  const trimmed = draft.trim()
  const canSend = trimmed.length > 0 && trimmed.length <= MAX_MESSAGE_LENGTH && !sending

  const send = async () => {
    if (!canSend) return
    setSending(true)
    setSendError(null)
    try {
      await onSend(trimmed)
      setDraft('')
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Message could not be sent.')
    } finally {
      setSending(false)
    }
  }

  const clear = async () => {
    setClearing(true)
    try {
      await onClear()
      setConfirmingClear(false)
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Conversation could not be cleared.')
      setConfirmingClear(false)
    } finally {
      setClearing(false)
    }
  }

  return (
    <>
      <div className="flex flex-col h-full min-h-0 glass bg-glass rounded-[18px] border border-glass-rim shadow-glass">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate">{title}</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Lock className="h-3 w-3" />
              {subtitle ?? 'Private between this facility and the KalingApp admins'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            disabled={messages.length === 0 || clearing}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-destructive text-destructive hover:bg-destructive hover:text-white transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none text-sm font-medium"
          >
            <Trash2 className="h-4 w-4" />
            Clear session
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-3 bg-[#FFF8FA]/60">
          {loading && messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center text-sm text-destructive">{error}</div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground text-center px-6">
              No messages yet. Anything you send here is visible only to this facility and the KalingApp admins.
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.side === mySide
              return (
                <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      mine
                        ? 'bg-primary text-white rounded-tr-md'
                        : 'bg-white border border-border text-foreground rounded-tl-md'
                    }`}
                  >
                    {m.body}
                  </div>
                  <span className="mt-1 text-[11px] text-muted-foreground">
                    {mine ? 'You' : m.sender_name} · {formatTime(m.created_at)}
                  </span>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="px-6 py-4 border-t border-border">
          {sendError && <p className="mb-2 text-sm text-destructive">{sendError}</p>}
          <div className="flex items-end gap-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter is a new line.
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              maxLength={MAX_MESSAGE_LENGTH}
              rows={2}
              placeholder="Write a message…"
              className="flex-1 resize-none px-4 py-3 bg-white border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-[#E05F86] text-white transition-all duration-200 disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground text-right">
            {draft.length}/{MAX_MESSAGE_LENGTH}
          </p>
        </div>
      </div>

      {/* Clear confirmation -- a sibling of the panel, not a child: the
          panel's backdrop-filter would make it the containing block for
          this fixed overlay. */}
      {confirmingClear && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-session-title"
        >
          <div className="bg-white rounded-[20px] border border-border max-w-md w-full shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 p-2.5 rounded-xl bg-[#FFDAD9] text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 id="clear-session-title" className="text-lg font-bold text-foreground">
                  Clear this conversation?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Every message in this conversation will be permanently deleted for both the facility and the
                  admins. This can&apos;t be undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmingClear(false)}
                disabled={clearing}
                className="px-5 py-2.5 bg-white hover:bg-light-pink border-2 border-primary text-primary rounded-xl transition-all duration-200 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={clear}
                disabled={clearing}
                className="px-5 py-2.5 rounded-xl text-white bg-destructive hover:bg-destructive/90 transition-all duration-200 disabled:opacity-60 flex items-center gap-2"
              >
                {clearing && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete all messages
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
