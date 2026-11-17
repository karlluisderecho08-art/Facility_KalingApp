'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarOff, CalendarPlus, Loader2, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DateCalendar } from '@/components/date-calendar'
import { ProposeDateDialog } from '@/components/propose-date-dialog'
import { apiFetch } from '@/lib/api'
import { STATUS_LABELS, formatDateTime, type BookingStatus, type MilkBankRequest } from '@/lib/booking'
import { isWeekend, parseDateString, toDateString } from '@/lib/scheduling'

// GET/POST /milkbank/facilities/mine/closed-days/ (backend: MyFacilityClosedDaysView).
interface BookingOnClosedDay {
  id: number
  date: string
  time: string
  request_type: 'DONOR' | 'RECIPIENT'
  status: BookingStatus
  mother: string
}

interface ClosedDays {
  facility_id: number
  facility_name: string
  unavailable_donor_dates: string[]
  unavailable_recipient_dates: string[]
  holiday_dates: string[]
  bookings_on_closed_days: BookingOnClosedDay[]
}

// The 409 that asks to confirm closing days with bookings on them.
interface Confirmation {
  detail: string
  affected_bookings: BookingOnClosedDay[]
}

type CloseFor = 'both' | 'donors' | 'recipients'

const CLOSE_FOR_OPTIONS: { value: CloseFor; label: string }[] = [
  { value: 'both', label: 'Everyone' },
  { value: 'donors', label: 'Donors only' },
  { value: 'recipients', label: 'Recipients only' },
]

// The longest stretch closed in one go (backend: closures.MAX_RANGE_DAYS).
const MAX_RANGE_DAYS = 92

function longDate(date: string) {
  return parseDateString(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function addDays(date: string, days: number) {
  const d = parseDateString(date)
  d.setDate(d.getDate() + days)
  return toDateString(d)
}

/**
 * Closed Days: the facility closing days itself -- a doctor on leave, the lab
 * out of service -- for everyone, or for donors or recipients only. Mothers'
 * calendars grey the day out at once and nothing new can be booked on it.
 * Bookings already on a day being closed are listed first; once confirmed,
 * each mother is told a new date is coming, and they show here (and under
 * Booking Requests, marked "Closed day") until a new date is proposed.
 */
export default function ClosedDaysPage() {
  const [data, setData] = useState<ClosedDays | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [closeFor, setCloseFor] = useState<CloseFor>('both')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [reopening, setReopening] = useState<string | null>(null)

  const [proposeRequest, setProposeRequest] = useState<MilkBankRequest | null>(null)
  const [openingId, setOpeningId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const res = await apiFetch('/milkbank/facilities/mine/closed-days/')
      if (!res.ok) throw new Error(`Could not load your closed days (${res.status})`)
      setData(await res.json())
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load your closed days')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const today = toDateString(new Date())
  const holidays = useMemo(() => data?.holiday_dates ?? [], [data])

  // Weekends and holidays are always closed, so they can't be picked.
  const alwaysClosed = useCallback(
    (date: string): string | null => {
      if (date < today) return 'This date has passed'
      if (isWeekend(date)) return 'Weekends are always closed'
      if (holidays.includes(date)) return 'Holiday: always closed'
      return null
    },
    [today, holidays]
  )

  // The weekdays a range covers (weekends and holidays skipped, as the server does).
  const daysInRange = useMemo(() => {
    if (!start) return []
    const last = end || start
    const days: string[] = []
    for (let d = start; d <= last; d = addDays(d, 1)) {
      if (!isWeekend(d) && !holidays.includes(d)) days.push(d)
    }
    return days
  }, [start, end, holidays])

  // Upcoming closed days, each with who it is closed for.
  const upcoming = useMemo(() => {
    if (!data) return []
    const donor = new Set(data.unavailable_donor_dates)
    const recipient = new Set(data.unavailable_recipient_dates)
    return Array.from(new Set([...donor, ...recipient]))
      .filter((d) => d >= today)
      .sort()
      .map((date) => ({
        date,
        label:
          donor.has(date) && recipient.has(date) ? 'Everyone' : donor.has(date) ? 'Donors only' : 'Recipients only',
      }))
  }, [data, today])

  const send = async (body: Record<string, unknown>, confirmed: boolean) => {
    const res = await apiFetch('/milkbank/facilities/mine/closed-days/', {
      method: 'POST',
      body: JSON.stringify({ ...body, ...(confirmed ? { confirm_closing: true } : {}) }),
    })
    const payload = await res.json().catch(() => null)
    return { res, payload }
  }

  const handleClose = async (confirmed = false) => {
    if (!start || daysInRange.length === 0) return
    setIsSaving(true)
    setSaveError(null)
    setSaved(null)
    try {
      const { res, payload } = await send({ start, end: end || start, close_for: closeFor }, confirmed)
      if (res.status === 409 && payload?.code === 'confirm_closing') {
        setConfirmation({ detail: payload.detail, affected_bookings: payload.affected_bookings ?? [] })
        return
      }
      if (!res.ok) throw new Error(payload?.detail || 'Could not close these days')
      setData(payload)
      setConfirmation(null)
      const count = daysInRange.length
      setSaved(
        `Closed ${count} day${count === 1 ? '' : 's'} for ${CLOSE_FOR_OPTIONS.find((o) => o.value === closeFor)?.label.toLowerCase()}.`
      )
      setStart('')
      setEnd('')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not close these days')
      setConfirmation(null)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReopen = async (date: string) => {
    setReopening(date)
    setSaveError(null)
    setSaved(null)
    try {
      const { res, payload } = await send({ start: date, end: date, close_for: 'none' }, false)
      if (!res.ok) throw new Error(payload?.detail || 'Could not reopen this day')
      setData(payload)
      setSaved(`${longDate(date)} is open again.`)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not reopen this day')
    } finally {
      setReopening(null)
    }
  }

  const openPropose = async (bookingId: number) => {
    setOpeningId(bookingId)
    setSaveError(null)
    try {
      const res = await apiFetch(`/milkbank/requests/${bookingId}/`)
      if (!res.ok) throw new Error('Could not open this booking')
      setProposeRequest(await res.json())
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not open this booking')
    } finally {
      setOpeningId(null)
    }
  }

  const rangeSummary =
    start && daysInRange.length > 0
      ? `${daysInRange.length} day${daysInRange.length === 1 ? '' : 's'}: ${longDate(daysInRange[0])}${
          daysInRange.length > 1 ? ` to ${longDate(daysInRange[daysInRange.length - 1])}` : ''
        }`
      : start
      ? 'No weekdays to close in this range.'
      : ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Closed Days</h1>
        <p className="text-muted-foreground mt-2">
          Close a day when your facility can&apos;t take appointments, such as a doctor on leave or the lab out of
          service. Mothers can&apos;t book it, and bookings already on it are flagged for a new date.
        </p>
      </div>

      {saveError && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {saveError}
        </div>
      )}
      {saved && (
        <div role="status" className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm text-accent font-medium">
          {saved}
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading closed days...
          </CardContent>
        </Card>
      ) : loadError || !data ? (
        <Card>
          <CardContent className="pt-6 text-center text-destructive space-y-3">
            <p>{loadError || 'Could not load your closed days'}</p>
            <Button variant="outline" onClick={load}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {data.bookings_on_closed_days.length > 0 && (
            <Card className="border-amber-300 bg-amber-50/60 dark:bg-amber-950/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                  <CardTitle>Bookings that need a new date ({data.bookings_on_closed_days.length})</CardTitle>
                </div>
                <CardDescription>
                  These mothers were told their day is closed and a new date is coming. Propose one to each; until
                  then their booking can&apos;t be confirmed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.bookings_on_closed_days.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm">{b.mother || 'Mother'}</span>
                        <Badge variant={b.request_type === 'DONOR' ? 'default' : 'secondary'}>
                          {b.request_type === 'DONOR' ? 'Donor' : 'Recipient'}
                        </Badge>
                        <Badge variant="outline">{STATUS_LABELS[b.status] ?? b.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDateTime(b.date, b.time)}</p>
                    </div>
                    <Button
                      variant="outline"
                      className="border-accent text-accent hover:bg-light-pink/30 shrink-0"
                      onClick={() => openPropose(b.id)}
                      disabled={openingId === b.id}
                    >
                      {openingId === b.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CalendarPlus className="h-4 w-4 mr-2" />
                      )}
                      Propose New Date
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Close days</CardTitle>
              <CardDescription>
                Pick the first day, and the last one for more than a day. Weekends and holidays are always closed
                and are skipped.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">First day</p>
                  <DateCalendar
                    value={start}
                    onChange={(d) => {
                      setStart(d)
                      if (end && (end < d || end > addDays(d, MAX_RANGE_DAYS - 1))) setEnd('')
                    }}
                    blockedReason={alwaysClosed}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Last day <span className="font-normal text-muted-foreground">(optional)</span>
                  </p>
                  <DateCalendar
                    value={end}
                    onChange={setEnd}
                    blockedReason={(d) => {
                      if (!start) return 'Pick the first day first'
                      if (d < start) return 'Before the first day'
                      if (d > addDays(start, MAX_RANGE_DAYS - 1)) return `At most ${MAX_RANGE_DAYS} days at a time`
                      return alwaysClosed(d)
                    }}
                    markedDate={start || undefined}
                    markedLabel="The first day"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Closed for</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Closed for">
                  {CLOSE_FOR_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={closeFor === option.value}
                      onClick={() => setCloseFor(option.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                        closeFor === option.value
                          ? 'bg-primary text-white'
                          : 'bg-muted text-muted-foreground hover:bg-light-pink/50 hover:text-primary'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  A day already closed takes the new choice: closing it for donors only reopens it for recipients.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground">{rangeSummary || 'No days picked yet.'}</p>
                <Button
                  className="bg-primary hover:bg-primary/90 text-white"
                  onClick={() => handleClose(false)}
                  disabled={!start || daysInRange.length === 0 || isSaving}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarOff className="h-4 w-4 mr-2" />}
                  {isSaving ? 'Saving...' : daysInRange.length > 1 ? 'Close these days' : 'Close this day'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming closed days</CardTitle>
              <CardDescription>
                {holidays.length > 0
                  ? `Also always closed: weekends and holidays. Next holidays: ${holidays
                      .slice(0, 5)
                      .map((d) => parseDateString(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
                      .join(', ')}.`
                  : 'Also always closed: weekends and holidays.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No days closed.</p>
              ) : (
                <div className="divide-y divide-border">
                  {upcoming.map(({ date, label }) => (
                    <div key={date} className="flex items-center justify-between gap-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium">{longDate(date)}</p>
                        <p className="text-xs text-muted-foreground">Closed for {label.toLowerCase()}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReopen(date)}
                        disabled={reopening === date}
                      >
                        {reopening === date ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4 mr-2" />
                        )}
                        Reopen
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={!!confirmation} onOpenChange={(open) => !open && !isSaving && setConfirmation(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bookings fall on these days</DialogTitle>
            <DialogDescription>{confirmation?.detail.replace(' Save again to confirm.', '')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {confirmation?.affected_bookings.map((b) => (
              <div
                key={b.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-3 rounded-lg bg-muted/60 px-3 py-2 text-sm"
              >
                <span className="font-medium">{b.mother || 'Mother'}</span>
                <span className="text-muted-foreground sm:text-right">
                  {b.request_type === 'DONOR' ? 'Donor' : 'Recipient'} · {formatDateTime(b.date, b.time)}
                </span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-1">
              Each mother is told the day is closed and that you will propose a new date. You can do that from
              here or from Booking Requests.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmation(null)} disabled={isSaving}>
              Go back
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => handleClose(true)}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Close anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProposeDateDialog
        request={proposeRequest}
        onClose={() => setProposeRequest(null)}
        onProposed={() => {
          setProposeRequest(null)
          setSaved('New date sent. She can accept it or choose another time in the app.')
          load()
        }}
      />
    </div>
  )
}
