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
  // Short label for why a DECLINED request was declined ("Failed breastmilk
  // collection"). Blank for anything that was never declined.
  decline_reason: string
  submitted_at: string
  preferred_date: string
  preferred_time: string
  // When her appointment begins (epoch ms, worked out by the server on the
  // Manila clock), or null when the time can't be read. Optional: an older
  // backend doesn't send it.
  appointment_start_ms?: number | null
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
  // RECIPIENT only: the millilitres the mother asked for on the Request Milk
  // form. null for a DONOR and for recipient requests made before the field
  // existed. A request, not a reservation -- stock only moves at completion.
  requested_ml: number | null
  // Set when she asked in 100 mL bottles (only at a facility that dispenses
  // bottles); requested_ml is then this x 100. Optional: an older backend
  // doesn't send it.
  requested_bottles?: number | null
  // DONOR only: how her milk reaches the facility at Breastmilk Collection.
  // '' when she booked from an app version that didn't ask. Optional: an
  // older backend doesn't send either field.
  collection_method?: CollectionMethod | ''
  // The courier booking link she pasted -- only ever set for 'drop_off'.
  delivery_link?: string
  // 'pickup' only: where to collect the milk -- the pin from her phone plus
  // the address and landmark she typed. Empty/null for any other method, for
  // a booking from an app version that didn't ask, and a week after the
  // booking closed (the backend clears them).
  pickup_address?: string
  pickup_landmark?: string
  pickup_latitude?: number | null
  pickup_longitude?: number | null
  // When the request expires if nobody acts: the facility's 8 business hours
  // while pending, hers to confirm or answer a proposed date. null otherwise.
  response_deadline?: string | null
  // A completed booking kept after its mother deleted her account: no name or
  // email any more, only a reference shared by all her kept bookings.
  owner_deleted?: boolean
  former_owner_ref?: string
  // DONOR only (null for a recipient): whether her screening answers arrived.
  has_questionnaire?: boolean | null
  // Open bookings only: the day it holds is now closed at this facility.
  appointment_day_closed?: boolean
}

export type CollectionMethod = 'pickup' | 'walk_in' | 'drop_off'

export const COLLECTION_METHOD_LABELS: Record<CollectionMethod, string> = {
  pickup: 'Pick up',
  walk_in: 'Walk-in',
  drop_off: 'Drop off (courier delivery)',
}

/** What staff need to do for each method -- one line under the label. */
export const COLLECTION_METHOD_HINTS: Record<CollectionMethod, string> = {
  pickup: 'The facility collects the milk from her.',
  walk_in: 'She brings the milk to the facility herself.',
  drop_off: 'She sends the milk by courier. Track it with her delivery booking link.',
}

/** The statuses a booking never leaves. */
export const CLOSED_STATUSES: readonly string[] = ['completed', 'declined', 'expired', 'cancelled']

/** True when this request is still in progress (its chat is open). */
export function isOpenBooking(request: { current_sub_status: string }): boolean {
  return !CLOSED_STATUSES.includes(request.current_sub_status)
}

/**
 * Who the booking is for, as staff see it. A completed booking kept after its
 * mother deleted her account has no name or email any more -- only the
 * reference all her kept bookings share.
 */
export function motherLabel(
  request: Pick<MilkBankRequest, 'owner_name' | 'owner_email'> & { owner_deleted?: boolean; former_owner_ref?: string }
): string {
  if (request.owner_deleted) {
    return request.former_owner_ref ? `Deleted account (${request.former_owner_ref})` : 'Deleted account'
  }
  return request.owner_name || request.owner_email
}

/** True when a search matches this booking's mother (null-safe for kept, anonymised bookings). */
export function matchesMother(
  request: Pick<MilkBankRequest, 'owner_name' | 'owner_email'> & { owner_deleted?: boolean; former_owner_ref?: string },
  query: string
): boolean {
  if (!query) return true
  return [request.owner_name, request.owner_email, motherLabel(request)].some((text) =>
    (text || '').toLowerCase().includes(query)
  )
}

/**
 * The slot a booking holds at the facility: the offered one while a proposed
 * date waits for her answer, otherwise the one she booked (backend:
 * scheduling.held_day / capacity.holding_requests).
 */
export function heldSlot(
  request: Pick<MilkBankRequest, 'current_sub_status' | 'preferred_date' | 'preferred_time' | 'counter_offer_date' | 'counter_offer_time'>
): { date: string; time: string } {
  if (request.current_sub_status === 'counter_offered' && request.counter_offer_date) {
    return { date: request.counter_offer_date, time: request.counter_offer_time }
  }
  return { date: request.preferred_date, time: request.preferred_time }
}

/**
 * Whether staff can still propose a new date: before the facility has
 * answered, while it waits on her, or -- once confirmed -- while her
 * appointment is still ahead (a donor's first step after confirming, a
 * recipient's review or pickup). The same rule the backend enforces
 * (scheduling.appointment_still_ahead).
 */
export function canProposeNewDate(request: MilkBankRequest): boolean {
  const status = request.current_sub_status
  if (status === 'pending' || status === 'awaiting_attendance' || status === 'counter_offered') return true
  if (status !== 'scheduled') return false
  const stage = request.stages[request.current_stage_index]
  if (request.request_type === 'RECIPIENT') return stage === 'Status' || stage === 'Results'
  return request.current_stage_index === request.stages.indexOf('Booking Confirmation') + 1
}

/** "Nov 20, 3:00 PM" -- a deadline on the browser's clock (the facility's own, in Manila). */
export function formatDeadline(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/** "3 bottles (300 mL)" when she asked in bottles, else "250 mL". */
export function requestedAmountLabel(requestedMl: number, requestedBottles?: number | null): string {
  const ml = `${requestedMl.toLocaleString()} mL`
  if (!requestedBottles) return ml
  return `${requestedBottles} bottle${requestedBottles === 1 ? '' : 's'} (${ml})`
}

export type BookingStatus =
  | 'pending'
  | 'awaiting_attendance'
  | 'scheduled'
  | 'counter_offered'
  | 'completed'
  | 'declined'
  | 'expired'
  | 'cancelled'

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  awaiting_attendance: 'Awaiting Attendance',
  scheduled: 'Scheduled',
  counter_offered: 'Counter Offer Proposed',
  completed: 'Completed',
  declined: 'Declined',
  expired: 'Expired',
  cancelled: 'Cancelled by Mother',
}

/**
 * A booking's status in words. A Drop off confirms with its courier's
 * delivery link instead of attendance (the backend's
 * collection.confirms_by_delivery_link), so while it waits on her it reads
 * "Awaiting Delivery Link". Once she sends it she goes on to Counseling and
 * Testing, like every donor.
 */
export function bookingStatusLabel(request: {
  current_sub_status: string
  request_type?: string
  collection_method?: string | null
}): string {
  if (
    request.current_sub_status === 'awaiting_attendance' &&
    request.request_type === 'DONOR' &&
    request.collection_method === 'drop_off'
  ) {
    return 'Awaiting Delivery Link'
  }
  return (STATUS_LABELS as Record<string, string>)[request.current_sub_status] || request.current_sub_status
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
  breastmilkCollection: 'Breastmilk Collection',
  results: 'Results',
} as const

export const RECIPIENT_STAGES = {
  requirements: 'Requirements',
  status: 'Status',
  bookingConfirmation: 'Booking Confirmation',
  results: 'Results',
} as const

// What staff can pick when they decline someone partway through, per phase.
// Each phase offers the ways it can genuinely fail, plus "Others" (which
// requires a note, because "Others" alone tells the mother nothing). These
// labels are what the admin statistics count, so a renamed label starts a
// new bar in the "top reasons" chart rather than merging with the old one.
export const OTHER_DECLINE_REASON = 'Others'

// A no-show, at any step she has to turn up for (or, for a Pick up, be home
// for). Its own reason so missed appointments can be counted, instead of
// disappearing into "Others".
export const MISSED_APPOINTMENT_REASON = 'Missed the appointment'

export const DECLINE_REASONS = {
  donorCounseling: [
    'Failed blood test',
    'Failed physical examination',
    'Did not pass counseling',
    MISSED_APPOINTMENT_REASON,
    OTHER_DECLINE_REASON,
  ],
  donorCollection: ['Failed breastmilk collection', MISSED_APPOINTMENT_REASON, OTHER_DECLINE_REASON],
  donorResults: ['Milk did not meet quality standards', OTHER_DECLINE_REASON],
  recipientReview: ['Incomplete or invalid requirements', OTHER_DECLINE_REASON],
  recipientResults: ['Not enough milk available', MISSED_APPOINTMENT_REASON, OTHER_DECLINE_REASON],
} as const

// The Booking Request desk's own reasons (pending requests, and proposed
// dates she hasn't answered). "No Available Doctor" is deliberately not one:
// that is a reason to propose another date, not to refuse her. A donor whose
// screening answers never arrived can be declined with "Screening answers
// missing", which tells her to send a new request and answer them again.
export const SCREENING_MISSING_REASON = 'Screening answers missing'
export const DESK_DECLINE_REASONS = {
  donor: ['Outdated Serological Test', SCREENING_MISSING_REASON, OTHER_DECLINE_REASON],
  recipient: ['Not enough milk available', 'Incomplete or invalid requirements', OTHER_DECLINE_REASON],
} as const

// What the MOTHER is shown when a request is declined (backend:
// milkbank/results.py). She never sees "reason -- notes" verbatim any more:
// each reason has a plain explanation written for her. For the reasons below,
// which may point to a health concern for her, she is also advised to see her
// doctor and the notes are NOT shown to her -- they stay with the facility,
// so lab findings can be recorded there. For every other reason the notes are
// passed on as "Note from the facility". Keep this list in step with the
// backend's (the entries marked as a health concern there).
export const HEALTH_DECLINE_REASONS: readonly string[] = [
  'Failed blood test',
  'Failed physical examination',
  'Failed breastmilk collection',
]

/** The line under a decline dialog's notes box: who will read what is typed there. */
export function declineNotesHint(reason: string): string {
  if (!reason) return ''
  if (HEALTH_DECLINE_REASONS.includes(reason)) {
    return 'The mother sees a plain explanation and is advised to see her doctor. These notes stay with the facility — she does not see them.'
  }
  if (reason === OTHER_DECLINE_REASON) {
    return 'These notes are the explanation the mother reads. Use plain words — no lab values or medical terms.'
  }
  return 'The mother sees a plain explanation of this reason, plus these notes. Keep them practical and in plain words.'
}

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
  if (CLOSED_STATUSES.includes(request.current_sub_status)) {
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
