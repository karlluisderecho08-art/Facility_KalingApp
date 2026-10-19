'use client'

import { useCallback, useEffect, useState } from 'react'
import { MessageThread, type ThreadMessage } from '@/components/message-thread'
import { clearThread, getThread, sendMessage } from '@/lib/messaging'

// How often an open thread checks for replies. Paused while the tab is hidden.
const POLL_MS = 5000

export default function MessagesPage() {
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [facilityName, setFacilityName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await getThread()
      setMessages(data.messages)
      setFacilityName(data.facility_name)
      setError(null)
      // Opening the thread marks it read; let the sidebar badge catch up.
      window.dispatchEvent(new Event('kalingapp:messages-read'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load messages.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(() => {
      if (!document.hidden) load()
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Messages</h1>
        <p className="text-muted-foreground mt-2">Talk privately with the KalingApp admin team</p>
      </div>
      <div className="h-[calc(100vh-18rem)] min-h-[420px]">
        <MessageThread
          title={facilityName ? `${facilityName} ↔ KalingApp Admin` : 'KalingApp Admin'}
          messages={messages}
          mySide="facility"
          loading={loading}
          error={error}
          onSend={async (body) => {
            const sent = await sendMessage(body)
            setMessages((current) => [...current, sent])
          }}
          onClear={async () => {
            await clearThread()
            setMessages([])
          }}
        />
      </div>
    </div>
  )
}
