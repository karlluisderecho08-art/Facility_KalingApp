'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { parseDateString, toDateString } from '@/lib/scheduling'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

interface DateCalendarProps {
  /** Selected date, yyyy-mm-dd, or '' for none. */
  value: string
  onChange: (date: string) => void
  /** A reason the date can't be picked (shown on hover), or null if it can. */
  blockedReason: (date: string) => string | null
  /** A date to mark without blocking it -- the date she asked for. */
  markedDate?: string
  markedLabel?: string
}

/**
 * A month grid whose unavailable days are greyed out and can't be clicked,
 * which the browser's own <input type="date"> can't do for weekends or a
 * facility's unavailable dates. Opens on the selected date's month (or this
 * month) and never goes back before the current month.
 */
export function DateCalendar({ value, onChange, blockedReason, markedDate, markedLabel }: DateCalendarProps) {
  const today = new Date()
  const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const initial = value ? parseDateString(value) : today
  const [viewMonth, setViewMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1))

  const firstWeekday = viewMonth.getDay()
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      toDateString(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1))
    ),
  ]

  const canGoBack = viewMonth.getTime() > startOfThisMonth.getTime()
  const shiftMonth = (by: number) =>
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + by, 1))

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="p-1.5 rounded-lg hover:bg-light-pink/40 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">
          {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="p-1.5 rounded-lg hover:bg-light-pink/40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day) => (
          <span key={day} className="text-[11px] font-medium text-muted-foreground py-1">
            {day}
          </span>
        ))}
        {cells.map((date, index) => {
          if (!date) return <span key={`blank-${index}`} />
          const reason = blockedReason(date)
          const blocked = reason !== null
          const selected = date === value
          const marked = date === markedDate
          return (
            <button
              key={date}
              type="button"
              disabled={blocked}
              onClick={() => onChange(date)}
              title={blocked ? reason : marked ? markedLabel : undefined}
              aria-pressed={selected}
              className={[
                'h-9 rounded-lg text-sm transition relative',
                selected
                  ? 'bg-primary text-white font-semibold'
                  : blocked
                  ? 'bg-muted/60 text-muted-foreground/40 cursor-not-allowed line-through decoration-muted-foreground/30'
                  : 'hover:bg-light-pink/50',
                marked && !selected ? 'ring-1 ring-accent' : '',
              ].join(' ')}
            >
              {Number(date.slice(8))}
            </button>
          )
        })}
      </div>

      {markedDate && markedLabel && (
        <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm ring-1 ring-accent" />
          {markedLabel}
        </p>
      )}
    </div>
  )
}
