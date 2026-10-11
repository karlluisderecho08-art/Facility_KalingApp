'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { apiFetch, getMe } from '@/lib/api'

// Capacity is bookings PER DAY (backend: milkbank/capacity.py). Each day has
// its own count -- a booking takes a slot on the date it is for, from the
// moment it is submitted (pending included), and gives it back if declined or
// expired. This card shows the next ten weekdays as the backend reports them
// in the facility record's `upcoming_bookings`.

interface DayCount {
  date: string
  count: number
}

interface FacilityCalendar {
  capacity: number
  upcoming_bookings?: DayCount[]
}

function dayLabel(iso: string, index: number) {
  const date = new Date(`${iso}T00:00:00`)
  const label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return index === 0 && iso === localToday() ? `Today, ${label.split(', ')[1] ?? label}` : label
}

function localToday() {
  const now = new Date()
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`
}

export function DailyBookingsCard() {
  const [facility, setFacility] = useState<FacilityCalendar | null>(null)
  const [state, setState] = useState<'loading' | 'loaded' | 'unavailable'>('loading')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const me = await getMe()
        const id = typeof me?.facility === 'number' ? me.facility : null
        if (id === null) throw new Error('No facility assigned')
        const res = await apiFetch(`/milkbank/facilities/${id}/`)
        if (!res.ok) throw new Error(`Failed (${res.status})`)
        const body: FacilityCalendar = await res.json()
        if (!cancelled) {
          setFacility(body)
          setState('loaded')
        }
      } catch {
        if (!cancelled) setState('unavailable')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const days = facility?.upcoming_bookings ?? []
  const capacity = facility?.capacity ?? 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-light-pink text-primary">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Bookings per Day</CardTitle>
            <CardDescription>
              {state === 'loaded'
                ? `Up to ${capacity} booking${capacity === 1 ? '' : 's'} per day. Pending requests hold their day's slot until declined or expired.`
                : 'Each day has its own booking count.'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {state === 'loading' ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
        ) : state === 'unavailable' || days.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Daily booking counts are unavailable right now.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {days.map((day, index) => {
              const full = capacity > 0 && day.count >= capacity
              const fraction = capacity > 0 ? Math.min(1, day.count / capacity) : 0
              return (
                <li key={day.date} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground">{dayLabel(day.date, index)}</span>
                    <span className={`font-semibold ${full ? 'text-destructive' : 'text-foreground'}`}>
                      {day.count} / {capacity}
                      {full && <span className="ml-1.5 text-xs font-medium">Full</span>}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden="true">
                    <div
                      className={`h-full rounded-full ${full ? 'bg-destructive' : 'bg-primary'}`}
                      style={{ width: `${fraction * 100}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
