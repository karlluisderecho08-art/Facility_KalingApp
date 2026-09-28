// lib/booking.ts
//
// The booking shapes and stage names shared by the Booking Request desk
// and the six Donor/Recipient Process queues. These used to live inside
// app/admin/bookings/page.tsx, which was fine while that page was the
// only thing reading a booking -- it is not any more, and a second copy
// of STAGE names would be the easiest thing in this app to let drift.

export interface MilkBankRequest {
  id: number
  request_type: 'DONOR' | 'RECIPIENT'
  allocated_facility: number
  allocated_facility_name: string
  stages: string[]
  current_stage_index: number
  current_sub_status: BookingStatus
  staff_message: string
  submitted_at: string
  preferred_date: string
  preferred_time: string
  attendance_confirmed: boolean
  counter_offer_date: string | null
  counter_offer_time: string
  owner_email: string
  owner_name: string
  needs_representative: boolean
  representative_name: string
  representative_birthday: string | null
  representative_contact_number: string
  // Both null until this booking reaches 'completed'. amount_ml is the
  // millilitres staff recorded on the Results stage -- donated for a
  // DONOR, dispensed for a RECIPIENT.
  amount_ml: number | null
  completed_at: string | null
}

export type BookingStatus =
  | 'pending'
  | 'awaiting_attendance'
  | 'scheduled'
  | 'counter_offered'
  | 'completed'
  | 'declined'
  | 'expired'

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  awaiting_attendance: 'Awaiting Attendance',
  scheduled: 'Scheduled',
  counter_offered: 'Counter Offer Proposed',
  completed: 'Completed',
  declined: 'Declined',
  expired: 'Expired',
}

// The stage names the backend derives from request_type
// (milkbank.models.MilkBankRequest.DONOR_STAGES / RECIPIENT_STAGES).
//
// These strings ARE the contract between the two codebases -- every
// process queue below finds its rows by matching one of them against
// stages[current_stage_index]. They are matched by NAME rather than by
// index on purpose: the two pathways have different-length stage lists,
// so an index-based match would drag a recipient's "Booking Confirmation"
// into a donor queue. If the backend ever renames a stage, the matching
// queue goes empty rather than showing the wrong mothers -- that is the
// failure mode to watch for, and it is the safer of the two.
export const DONOR_STAGES = {
  status: 'Status',
  bookingConfirmation: 'Booking Confirmation',
  counselingAndTesting: 'Counseling and Testing',
  breastmilkAnalysis: 'Breastmilk Analysis',
  results: 'Results',
} as const

export const RECIPIENT_STAGES = {
  requirements: 'Requirements',
  status: 'Status',
  bookingConfirmation: 'Booking Confirmation',
  results: 'Results',
} as const

export function formatDateTime(preferredDate?: string, preferredTime?: string) {
  if (!preferredDate) return preferredTime || ''
  const d = new Date(`${preferredDate}T00:00:00`)
  const dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  return preferredTime ? `${dateStr} · ${preferredTime}` : dateStr
}

export function formatDateOnly(date: string) {
  const d = new Date(`${date}T00:00:00`)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatSubmitted(submittedAt: string) {
  return new Date(submittedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * True when this request is the one a given process queue is responsible
 * for right now: the right pathway, sitting on the right stage.
 *
 * Mostly does NOT filter on current_sub_status. A queue's stage is what
 * decides whether the work belongs there; the status decides which ACTION
 * is offered on the card (see ProcessQueue). Folding the status in here
 * would hide, say, a recipient who is awaiting attendance from the Booking
 * Confirmation queue whose entire job is to show exactly her.
 *
 * 'completed' is the one exception, and has to be excluded here rather
 * than left to ProcessQueue: current_stage_index never moves past the
 * request's last stage, so a completed request stays parked on "Results"
 * forever. Without this it would keep matching the Results queue after
 * being completed and re-show "Record amount & complete" on a transaction
 * that is already done. Finished requests live in Finished Transactions
 * (isFinished below) instead.
 */
export function isOnStage(
  request: MilkBankRequest,
  requestType: 'DONOR' | 'RECIPIENT',
  stage: string
): boolean {
  if (request.request_type !== requestType) return false
  if (['declined', 'expired', 'completed'].includes(request.current_sub_status)) {
    return false
  }
  return request.stages[request.current_stage_index] === stage
}

/** True for a request Finished Transactions is responsible for listing. */
export function isFinished(request: MilkBankRequest): boolean {
  return request.current_sub_status === 'completed'
}

export function formatAmount(amountMl: number | null): string {
  return amountMl === null ? '—' : `${amountMl.toLocaleString()} mL`
}

export function formatCompletedAt(completedAt: string | null): string {
  if (!completedAt) return '—'
  return new Date(completedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
