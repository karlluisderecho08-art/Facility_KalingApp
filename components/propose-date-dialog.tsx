'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DateCalendar } from '@/components/date-calendar'
import { apiFetch } from '@/lib/api'
import { formatDateTime, heldSlot, motherLabel, type MilkBankRequest } from '@/lib/booking'
import { TIME_SLOTS, dateBlockedReason, slotBlockedReason } from '@/lib/scheduling'

/** What the dialog needs to know about the booking it moves. */
export type ProposableRequest = Pick<
  MilkBankRequest,
  | 'id'
  | 'request_type'
  | 'allocated_facility'
  | 'preferred_date'
  | 'preferred_time'
  | 'current_sub_status'
  | 'counter_offer_date'
  | 'counter_offer_time'
  | 'owner_name'
  | 'owner_email'
  | 'appointment_day_closed'
>

// Why a new date is proposed -- what she reads in the app's "Message from
// Facility Team" card, right above Accept / Choose New Time. Without it the
// date simply moves with no explanation attached.
const REASONS = [
  {
    key: 'no_doctor',
    label: 'No doctor is available on her date',
    message: 'No available doctor on your requested date — we have proposed a date when one is available.',
  },
  {
    key: 'closed',
    label: 'The facility is closed on her date',
    message: 'The facility is closed on your appointment date — we have proposed a new date.',
  },
  { key: 'other', label: 'Another reason (explain in the notes)', message: '' },
] as const
type ReasonKey = (typeof REASONS)[number]['key']

interface ProposeDateDialogProps {
  /** The booking to move; the dialog is open while this is set. */
  request: ProposableRequest | null
  onClose: () => void
  /** The booking as the server returned it after the offer was sent. */
  onProposed: (updated: MilkBankRequest) => void
}

/**
 * Offers a mother a different appointment instead of refusing her: from the
 * Booking Request desk (pending), while she has yet to confirm, to replace an
 * offer she hasn't answered, or for a confirmed appointment that has to move
 * (its day was closed, say). The request stays alive the whole way through:
 * it moves to "Counter Offer Proposed", holding the offered slot, and in the
 * app she gets Accept or Choose New Time. She has 8 business hours to answer
 * (less if the new appointment comes sooner), or the request expires.
 *
 * The greyed-out dates and times are the same rules the backend enforces
 * (scheduling.counter_offer_errors) -- this only hides what it would refuse.
 */
export function ProposeDateDialog({ request, onClose, onProposed }: ProposeDateDialogProps) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [reason, setReason] = useState<ReasonKey>('no_doctor')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Dates the facility has closed for her pathway, days with no slot left,
  // holidays, and (donors) hours full at the lab. Until they load, weekends
  // and past dates are already blocked; if they fail, the server still is.
  const [unavailableDates, setUnavailableDates] = useState<string[]>([])
  const [fullyBookedDates, setFullyBookedDates] = useState<string[]>([])
  const [fullDonorSlots, setFullDonorSlots] = useState<Record<string, string[]>>({})
  const [holidayDates, setHolidayDates] = useState<string[]>([])

  const requestId = request?.id
  useEffect(() => {
    if (!request) return
    setDate('')
    setTime('')
    setReason(request.appointment_day_closed ? 'closed' : 'no_doctor')
    setNotes('')
    setError(null)
    setUnavailableDates([])
    setFullyBookedDates([])
    setFullDonorSlots({})
    setHolidayDates([])
    let cancelled = false
    apiFetch(`/milkbank/facilities/${request.allocated_facility}/`)
      .then((res) => (res.ok ? res.json() : null))
      .then((facility) => {
        if (!facility || cancelled) return
        setUnavailableDates(
          request.request_type === 'DONOR'
            ? facility.unavailable_donor_dates ?? []
            : facility.unavailable_recipient_dates ?? []
        )
        setHolidayDates(facility.holiday_dates ?? [])
        // The day she holds stays offerable (a different time): her own slot
        // there doesn't count against her.
        const held = heldSlot(request).date
        const dayFull: string[] = (facility.fully_booked_dates ?? []).filter((d: string) => d !== held)
        if (request.request_type === 'DONOR') {
          setFullDonorSlots(facility.full_donor_slots ?? {})
          setFullyBookedDates([...dayFull, ...(facility.donor_fully_booked_dates ?? [])])
        } else {
          setFullyBookedDates(dayFull)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // Reload only when a different booking is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  const requested = useMemo(
    () => ({ date: request?.preferred_date ?? '', time: request?.preferred_time ?? '' }),
    [request]
  )
  const alreadyOffered = useMemo(
    () =>
      request?.current_sub_status === 'counter_offered' && request.counter_offer_date
        ? { date: request.counter_offer_date, time: request.counter_offer_time }
        : null,
    [request]
  )

  // A time that was fine when picked can stop being: the date changed, or the
  // clock moved past it while the dialog sat open. Cleared rather than left
  // selected-but-greyed, where it could still be submitted.
  useEffect(() => {
    if (date && time && slotBlockedReason(time, date, requested, new Date(), fullDonorSlots[date], alreadyOffered)) {
      setTime('')
    }
  }, [date, time, requested, fullDonorSlots, alreadyOffered])

  const chosen = REASONS.find((r) => r.key === reason) ?? REASONS[0]
  const notesRequired = reason === 'other'
  const canSend = !!date && !!time && (!notesRequired || !!notes.trim()) && !isSubmitting

  const handleSubmit = async () => {
    if (!request || !canSend) return
    setIsSubmitting(true)
    setError(null)
    const extra = notes.trim()
    const staff_message = chosen.message ? (extra ? `${chosen.message} ${extra}` : chosen.message) : extra
    try {
      const res = await apiFetch(`/milkbank/requests/${request.id}/propose-counter-offer/`, {
        method: 'POST',
        body: JSON.stringify({ counter_offer_date: date, counter_offer_time: time, staff_message }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Could not propose a new date')
      onProposed(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not propose a new date')
    } finally {
      setIsSubmitting(false)
    }
  }

  const replacing = request?.current_sub_status === 'counter_offered'
  const confirmed = request?.current_sub_status === 'scheduled' || request?.current_sub_status === 'awaiting_attendance'

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{replacing ? 'Propose Another Date' : 'Propose a New Date'}</DialogTitle>
          <DialogDescription>
            Offer {request ? motherLabel(request) : ''} another date. Her request stays open
            {confirmed ? ', and her current appointment stands until she accepts the new one.' : '.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm space-y-0.5">
            <div>
              <span className="text-muted-foreground">She asked for </span>
              <span className="font-medium">{formatDateTime(request?.preferred_date, request?.preferred_time)}</span>
            </div>
            {alreadyOffered && (
              <div>
                <span className="text-muted-foreground">Offered now </span>
                <span className="font-medium">{formatDateTime(alreadyOffered.date, alreadyOffered.time)}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="propose-reason">
              Why <span className="text-destructive">*</span>
            </label>
            <select
              id="propose-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as ReasonKey)}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {REASONS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              New date <span className="text-destructive">*</span>
            </label>
            <DateCalendar
              value={date}
              onChange={setDate}
              blockedReason={(d) => dateBlockedReason(d, unavailableDates, new Date(), fullyBookedDates, holidayDates)}
              markedDate={requested.date}
              markedLabel="The date she asked for"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Time <span className="text-destructive">*</span>
            </label>
            {!date && <p className="text-xs text-muted-foreground">Pick a date first.</p>}
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map((slot) => {
                const why = date
                  ? slotBlockedReason(slot, date, requested, new Date(), fullDonorSlots[date], alreadyOffered)
                  : null
                const blocked = why !== null || !date
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={blocked}
                    title={why ?? undefined}
                    aria-pressed={time === slot}
                    onClick={() => setTime(slot)}
                    className={
                      time === slot
                        ? 'rounded-lg border border-primary bg-primary text-white text-sm py-2 font-medium'
                        : blocked
                        ? 'rounded-lg border border-border bg-muted/60 text-muted-foreground/40 text-sm py-2 cursor-not-allowed line-through decoration-muted-foreground/30'
                        : 'rounded-lg border border-border bg-background text-sm py-2 hover:bg-light-pink/30'
                    }
                  >
                    {slot}
                  </button>
                )
              })}
            </div>
            {date && (
              <p className="text-xs text-muted-foreground">
                Greyed-out times have passed, are hers already, or are full for donors.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="propose-notes">
              Notes{' '}
              {notesRequired ? (
                <span className="text-destructive">*</span>
              ) : (
                <span className="font-normal text-muted-foreground">(Optional)</span>
              )}
            </label>
            <textarea
              id="propose-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                notesRequired
                  ? 'Explain why in plain words — the mother reads this...'
                  : 'Anything else she should know — the mother reads this...'
              }
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              {chosen.message ? `She reads: “${chosen.message}”${notes.trim() ? ' and your notes.' : ''}` : 'Your notes are the explanation she reads.'}
            </p>
          </div>

          <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-2.5">
            She has 8 business hours to accept it or choose another time (less if the new appointment comes
            sooner). If she doesn&apos;t answer by then, the request expires.
          </p>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white" onClick={handleSubmit} disabled={!canSend}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting ? 'Sending...' : 'Send to Mother'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
