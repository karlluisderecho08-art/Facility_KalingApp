'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Check,
  X,
  Mail,
  Building2,
  CalendarClock,
  Eye,
  Loader2,
  Search,
  ClipboardList,
  Camera,
  UserRound,
  CalendarPlus,
  ListChecks,
  MessageCircle,
  Hourglass,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { apiFetch } from '@/lib/api'
import {
  CLOSED_STATUSES,
  DESK_DECLINE_REASONS,
  OTHER_DECLINE_REASON,
  STATUS_LABELS,
  bookingStatusLabel,
  canProposeNewDate,
  declineNotesHint,
  formatDeadline,
  heldSlot,
  isOpenBooking,
  matchesMother,
  motherLabel,
  requestedAmountLabel,
  type MilkBankRequest as Booking,
} from '@/lib/booking'
import { CollectionMethodInfo } from '@/components/collection-method'
import { ProposeDateDialog } from '@/components/propose-date-dialog'
import { useBookingChatUnread } from '@/lib/booking-chat'
import Link from 'next/link'

// The shared booking shape (lib/booking.ts), plus what only this page reads:
// a recipient's requirements, shown in View Details.
interface MilkBankRequest extends Booking {
  neonate_name: string
  clinic_info: string
  has_prescription_proof: boolean
  has_cooler: boolean
  has_medical_abstract: boolean
  // When the representative's details were removed under the retention
  // policy (7 days after the request closed). Optional: older backends omit it.
  representative_purged_at?: string | null
}

interface DonorQuestionnaire {
  [key: string]: boolean | number | string
  photo_attached: boolean
  submitted_at: string
}

type QuestionnaireState = 'idle' | 'loading' | 'loaded' | 'none' | 'error'

// The desk's decline reasons are DESK_DECLINE_REASONS (lib/booking.ts).
// "No Available Doctor" is deliberately not one: it was never really a reason
// to refuse a mother -- it is a reason to offer her a different day -- and as
// a decline it made her submit the whole thing again, questionnaire and
// serology photo included, to change a single date. It is the "Propose New
// Date" button instead (components/propose-date-dialog.tsx).
//
// "Others" is the only reason that says nothing on its own. Every other reason
// is shown to the mother as a plain explanation written for her (backend:
// milkbank/results.py); for "Others" the notes ARE that explanation, so
// picking it with an empty notes box would tell her nothing at all -- worse than not
// offering the option. So notes become mandatory the moment it is selected.
const OTHER_REASON = OTHER_DECLINE_REASON

// Recipient requests the facility has already said yes to and not yet
// dispensed: the milk they asked for is spoken for, so it can't also fill
// the request being decided.
const PROMISED_STATUSES = ['awaiting_attendance', 'scheduled', 'counter_offered']

const DONOR_QUESTIONNAIRE_FIELDS: [string, string][] = [
  ['good_general_health', 'Currently in good general health'],
  ['lactating_with_excess_supply', 'Baby is under 6 months old and producing more milk than baby needs'],
  ['free_of_infectious_disease', 'Free from HIV, Hepatitis B & C, and Syphilis'],
  ['recent_transfusion_or_transplant', 'Blood transfusion or organ transplant in the past 12 months'],
  ['uses_tobacco_alcohol_or_drugs', 'Smokes, drinks alcohol regularly, or uses recreational drugs'],
  ['on_medication_or_supplements', 'Taking regular medications or herbal supplements'],
  ['has_recent_serology_test', 'Has a serological (blood) test taken within the last 6 months'],
]

function formatDateTime(preferredDate: string | undefined, preferredTime: string | undefined) {
  if (!preferredDate) return preferredTime || ''
  const d = new Date(`${preferredDate}T00:00:00`)
  const dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  return preferredTime ? `${dateStr} · ${preferredTime}` : dateStr
}

function formatDateOnly(date: string) {
  const d = new Date(`${date}T00:00:00`)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// What the mother asked for next to what the facility can actually give her,
// so staff can see at a glance whether the request can be filled before they
// confirm. Shown for RECIPIENT requests only. "Free" is the stock minus what
// other recipients the facility already accepted asked for (`promised`): that
// milk is spoken for, even though stock only moves when it is dispensed.
// `stock` is undefined until the facility loads (or if it fails), in which
// case only the request itself is shown.
function RequestedVolume({
  requestedMl,
  requestedBottles,
  stock,
  promised,
  pending,
}: {
  requestedMl: number | null | undefined
  requestedBottles?: number | null
  stock: number | undefined
  promised: { ml: number; count: number }
  pending: boolean
}) {
  // == null, not === null: undefined too, e.g. a backend not yet serving the field.
  if (requestedMl == null) {
    return (
      <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
        No amount was specified with this request.
      </div>
    )
  }
  const known = stock !== undefined
  const free = known ? Math.max(0, stock - promised.ml) : 0
  const exceeds = known && requestedMl > free
  const remaining = free - requestedMl
  return (
    <div
      className={`rounded-lg border p-3 space-y-1 ${
        exceeds
          ? 'border-destructive/40 bg-destructive/5'
          : 'border-accent/30 bg-accent/5'
      }`}
    >
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-muted-foreground">Milk requested</span>
        <span className="font-semibold whitespace-nowrap">{requestedAmountLabel(requestedMl, requestedBottles)}</span>
      </div>
      {known && (
        <>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Current stock</span>
            <span className="font-medium whitespace-nowrap">{stock.toLocaleString()} mL</span>
          </div>
          {pending && promised.count > 0 && (
            <>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">
                  Promised to {promised.count} accepted request{promised.count === 1 ? '' : 's'}
                </span>
                <span className="font-medium whitespace-nowrap">− {promised.ml.toLocaleString()} mL</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Free to give</span>
                <span className="font-semibold whitespace-nowrap">{free.toLocaleString()} mL</span>
              </div>
            </>
          )}
          {pending && (
            <p className={`text-xs font-medium pt-1 ${exceeds ? 'text-destructive' : 'text-accent'}`}>
              {exceeds
                ? `Exceeds the milk free to give by ${(requestedMl - free).toLocaleString()} mL — you may not be able to fill this.`
                : `Can be filled — ${remaining.toLocaleString()} mL would remain free${promised.count > 0 ? ' after the requests already accepted' : ''}.`}
            </p>
          )}
        </>
      )}
    </div>
  )
}

// One heading style for every section of the View Details dialog (Booking,
// Requirements, Pickup Representative, Donor Questionnaire, Serology
// Photo) -- same icon
// chip the dashboard's own KPI cards use (bg-light-pink/text-primary, see
// app/admin/page.tsx), so the dialog reads as part of the same app rather
// than a plain data dump bolted onto it.
function SectionHeading({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="p-1.5 rounded-lg bg-light-pink text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{children}</h3>
    </div>
  )
}

// Where a confirmed request sits in its journey, for sorting/grouping the
// Confirmed tab -- earliest-waiting-on-someone first, Completed always
// last. A 'scheduled' request is ranked (and labeled) by its actual
// current_stage_index rather than lumped into one "Scheduled" bucket, so
// e.g. Counseling and Testing sorts ahead of Breastmilk Collection.
function phaseRank(request: MilkBankRequest): number {
  switch (request.current_sub_status) {
    case 'awaiting_attendance':
      return 0
    case 'counter_offered':
      return 1
    case 'scheduled':
      return 10 + request.current_stage_index
    case 'completed':
      return 1000
    default:
      return 500
  }
}

function phaseLabel(request: MilkBankRequest): string {
  if (request.current_sub_status === 'scheduled') {
    return request.stages[request.current_stage_index] || STATUS_LABELS.scheduled
  }
  return bookingStatusLabel(request)
}

function groupByPhase(requests: MilkBankRequest[]): [string, MilkBankRequest[]][] {
  const sorted = [...requests].sort(
    (a, b) => phaseRank(a) - phaseRank(b) || a.preferred_date.localeCompare(b.preferred_date)
  )
  const groups: [string, MilkBankRequest[]][] = []
  for (const request of sorted) {
    const label = phaseLabel(request)
    const lastGroup = groups[groups.length - 1]
    if (lastGroup && lastGroup[0] === label) {
      lastGroup[1].push(request)
    } else {
      groups.push([label, [request]])
    }
  }
  return groups
}

export default function BookingRequests() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') || 'pending'

  const [requests, setRequests] = useState<MilkBankRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const { byRequest: unreadChats } = useBookingChatUnread()
  const [detailsRequest, setDetailsRequest] = useState<MilkBankRequest | null>(null)
  const [questionnaire, setQuestionnaire] = useState<DonorQuestionnaire | null>(null)
  const [questionnaireState, setQuestionnaireState] = useState<QuestionnaireState>('idle')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoState, setPhotoState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')

  const [declineRequest, setDeclineRequest] = useState<MilkBankRequest | null>(null)
  const [declineReason, setDeclineReason] = useState('')
  const [declineNotes, setDeclineNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // The booking a new date is being proposed for (components/propose-date-dialog.tsx).
  const [proposeRequest, setProposeRequest] = useState<MilkBankRequest | null>(null)

  // facility id -> current stock in mL, for the requested-vs-available panel on
  // recipient cards. Empty until it loads; the panel then shows the request
  // without a comparison rather than guessing.
  const [stockByFacility, setStockByFacility] = useState<Record<number, number>>({})

  const loadRequests = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const res = await apiFetch('/milkbank/requests/all/')
      if (!res.ok) throw new Error(`Failed to load requests (${res.status})`)
      const data: MilkBankRequest[] = await res.json()
      setRequests(data)
      // Staff only ever see their own facility's requests, so this is
      // normally one fetch. Best-effort: a failure just hides the comparison.
      const ids = Array.from(new Set(data.filter((r) => r.request_type === 'RECIPIENT').map((r) => r.allocated_facility)))
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            const f = await apiFetch(`/milkbank/facilities/${id}/`)
            if (!f.ok) return null
            const body = await f.json()
            return typeof body.stock_level_ml === 'number' ? ([id, body.stock_level_ml] as const) : null
          } catch {
            return null
          }
        })
      )
      setStockByFacility(Object.fromEntries(entries.filter((e): e is readonly [number, number] => e !== null)))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load requests')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const query = searchTerm.trim().toLowerCase()
  const matchesSearch = (r: MilkBankRequest) =>
    !query || matchesMother(r, query) || r.allocated_facility_name.toLowerCase().includes(query)

  // Milk already promised at a facility, leaving `request` itself out.
  const promisedFor = (request: MilkBankRequest) => {
    const others = requests.filter(
      (r) =>
        r.id !== request.id &&
        r.request_type === 'RECIPIENT' &&
        r.allocated_facility === request.allocated_facility &&
        PROMISED_STATUSES.includes(r.current_sub_status) &&
        typeof r.requested_ml === 'number'
    )
    return { ml: others.reduce((sum, r) => sum + (r.requested_ml ?? 0), 0), count: others.length }
  }

  // Three buckets, and every request is in exactly one of them: this page
  // answers "was this booking approved?" and nothing else. Closed holds
  // whatever ended without being carried out: declined, expired, or
  // cancelled by the mother herself.
  //
  // It used to carry a fourth "Screening" tab, which was a view over the
  // confirmed set rather than a bucket of its own -- the work now lives in
  // the Donor Process and Recipient Process queues, where each phase gets a
  // screen that can actually act on it. Confirmed therefore lists everything
  // that was approved, wherever it has since reached, so this stays a
  // complete record of the decision rather than a partial one.
  const searchedRequests = requests.filter(matchesSearch)
  const pendingRequests = searchedRequests.filter((r) => r.current_sub_status === 'pending')
  const declinedRequests = searchedRequests.filter(
    (r) => r.current_sub_status !== 'completed' && CLOSED_STATUSES.includes(r.current_sub_status)
  )
  const confirmedRequests = searchedRequests.filter(
    (r) => r.current_sub_status === 'completed' || (r.current_sub_status !== 'pending' && isOpenBooking(r))
  )

  const handleConfirm = async (request: MilkBankRequest) => {
    setActionError(null)
    try {
      const res = await apiFetch(`/milkbank/requests/${request.id}/accept/`, {
        method: 'POST',
        body: JSON.stringify({ staff_message: '' }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail || 'Could not accept this request')
      const updated = await res.json()
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not accept this request')
    }
  }

  const handleOpenDecline = (request: MilkBankRequest) => {
    setDeclineRequest(request)
    setDeclineReason('')
    setDeclineNotes('')
    setActionError(null)
  }

  const handleSubmitDecline = async () => {
    if (!declineReason || !declineRequest) return
    // "Others" carries no information on its own, so it must never go out
    // alone -- the mother would be told she was declined with the single
    // word "Others" as the explanation. The button is disabled for this case
    // too, but the guard is repeated here because the handler must be safe
    // on its own rather than trusting the button's disabled state.
    if (declineReason === OTHER_REASON && !declineNotes.trim()) return
    setIsSubmitting(true)
    setActionError(null)
    const notes = declineNotes.trim()
    const staff_message = notes ? `${declineReason} — ${notes}` : declineReason
    try {
      const res = await apiFetch(`/milkbank/requests/${declineRequest.id}/decline/`, {
        method: 'POST',
        // `reason` is the short label the admin statistics group by, and picks
        // the plain explanation the mother is shown. staff_message (reason plus
        // notes) reaches her only for reasons that are not health-related --
        // see declineNotesHint in lib/booking.ts.
        body: JSON.stringify({ reason: declineReason, staff_message }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail || 'Could not decline this request')
      const updated = await res.json()
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      setDeclineRequest(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not decline this request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenPropose = (request: MilkBankRequest) => {
    setActionError(null)
    setProposeRequest(request)
  }

  /**
   * The offer went out (components/propose-date-dialog.tsx): the request is
   * now "Counter Offer Proposed", holding the offered slot, and she has
   * Accept or Choose New Time in the app -- no re-application either way.
   */
  const handleProposed = (updated: Booking) => {
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)))
    setProposeRequest(null)
  }

  const handleOpenDetails = async (request: MilkBankRequest) => {
    setDetailsRequest(request)
    if (request.request_type !== 'DONOR') {
      setQuestionnaireState('none')
      setQuestionnaire(null)
      return
    }
    setQuestionnaireState('loading')
    setQuestionnaire(null)
    setPhotoUrl(null)
    setPhotoState('idle')
    try {
      const res = await apiFetch(`/milkbank/requests/${request.id}/donor-questionnaire/`)
      if (res.status === 404) {
        setQuestionnaireState('none')
        return
      }
      if (!res.ok) throw new Error()
      const data = await res.json()
      setQuestionnaire(data)
      setQuestionnaireState('loaded')
      if (data.photo_attached) {
        loadSerologyPhoto(request.id)
      }
    } catch {
      setQuestionnaireState('error')
    }
  }

  const loadSerologyPhoto = async (requestId: number) => {
    setPhotoState('loading')
    try {
      const res = await apiFetch(`/milkbank/requests/${requestId}/serology-photo/`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      setPhotoUrl(URL.createObjectURL(blob))
      setPhotoState('loaded')
    } catch {
      setPhotoState('error')
    }
  }

  const RequestCard = ({
    request,
    variant,
  }: {
    request: MilkBankRequest
    variant: 'pending' | 'confirmed' | 'declined'
  }) => {
    // A request still waiting for an answer when her appointment hour came
    // can't be accepted as it is (the server refuses it): staff propose a new
    // date -- she keeps her application -- or decline. Left alone it expires.
    const appointmentPassed =
      variant === 'pending' &&
      typeof request.appointment_start_ms === 'number' &&
      request.appointment_start_ms <= Date.now()
    // The facility has since closed the day she holds: she needs a new date
    // first (the server refuses accepting it as it stands, and her confirming).
    const dayClosed = isOpenBooking(request) && request.appointment_day_closed === true
    // A donor's screening answers never arrived (the upload failed after
    // booking): she can send them again from the app; until then the server
    // refuses accepting her.
    const screeningMissing =
      variant === 'pending' && request.request_type === 'DONOR' && request.has_questionnaire === false
    const confirmBlockedBy = appointmentPassed
      ? 'Her appointment time has passed: propose a new date or decline'
      : dayClosed
      ? 'The facility is closed on her date: propose a new date'
      : screeningMissing
      ? 'Her screening answers have not arrived yet'
      : undefined
    const waitingOnHer =
      variant === 'confirmed' &&
      (request.current_sub_status === 'counter_offered' || request.current_sub_status === 'awaiting_attendance')
    // A new date for an accepted booking from here: one waiting on her, or one
    // on a day since closed. A confirmed appointment that just needs moving
    // is moved from its process queue.
    const showPropose =
      variant === 'confirmed' && canProposeNewDate(request) && (waitingOnHer || dayClosed)
    const borderClasses =
      variant === 'pending'
        ? 'border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/20'
        : variant === 'confirmed'
        ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20'
        : 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20'

    return (
      <Card className={borderClasses}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <CardTitle className="text-lg">{motherLabel(request)}</CardTitle>
                <Badge variant={request.request_type === 'DONOR' ? 'default' : 'secondary'}>
                  {request.request_type === 'DONOR' ? 'Donor Screening' : 'Recipient Request'}
                </Badge>
                {variant !== 'pending' && (
                  <Badge variant={variant === 'declined' ? 'destructive' : 'outline'}>
                    {bookingStatusLabel(request)}
                  </Badge>
                )}
                {variant === 'confirmed' && request.stages[request.current_stage_index] && (
                  <Badge variant="secondary">{request.stages[request.current_stage_index]}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(request.preferred_date, request.preferred_time)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 p-3 rounded-lg">
            {!request.owner_deleted && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{request.owner_email}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{request.allocated_facility_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <span>Submitted {new Date(request.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>

          {request.request_type === 'RECIPIENT' && (
            <RequestedVolume
              requestedMl={request.requested_ml}
              requestedBottles={request.requested_bottles}
              stock={stockByFacility[request.allocated_facility]}
              promised={promisedFor(request)}
              pending={variant === 'pending'}
            />
          )}

          {variant === 'declined' && request.current_sub_status === 'cancelled' && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              She cancelled this booking herself in the app. Its slot was freed at once.
            </div>
          )}

          {variant === 'declined' && request.current_sub_status === 'declined' && (request.staff_message || request.decline_reason) && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Decline Reason</p>
              <p className="text-sm font-medium text-destructive">
                {request.staff_message || request.decline_reason}
              </p>
            </div>
          )}

          {appointmentPassed && (
            <div role="note" className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-900 dark:text-amber-200">
              Her appointment time ({formatDateTime(request.preferred_date, request.preferred_time)}) has passed
              without an answer, so it can&apos;t be confirmed as it is. Propose a new date (she keeps her
              application), or decline it. Left alone, the request expires on its own.
            </div>
          )}

          {dayClosed && !appointmentPassed && (
            <div role="note" className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-900 dark:text-amber-200">
              <strong className="font-semibold">Closed day.</strong> The facility is closed on her appointment date
              ({formatDateTime(heldSlot(request).date, heldSlot(request).time)}), and she has been told a new date
              is coming. Propose one {request.current_sub_status === 'pending' ? 'before confirming' : 'so she can confirm it'}.
            </div>
          )}

          {screeningMissing && (
            <div role="note" className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-900 dark:text-amber-200">
              <strong className="font-semibold">Screening answers missing.</strong> Her health screening answers
              didn&apos;t reach KalingApp, so this request can&apos;t be confirmed yet. She can send them again from
              Booking Status in her app. If they don&apos;t come, decline it with &ldquo;Screening answers missing&rdquo;.
            </div>
          )}

          {waitingOnHer && (
            <div className="flex items-start gap-2 rounded-lg border border-border border-dashed p-3 text-sm text-muted-foreground">
              <Hourglass className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                {request.current_sub_status === 'counter_offered'
                  ? `Waiting for her answer to ${formatDateTime(request.counter_offer_date ?? '', request.counter_offer_time)}`
                  : request.request_type === 'DONOR' && request.collection_method === 'drop_off'
                  ? 'Waiting for her courier delivery link'
                  : 'Waiting for her to confirm she is coming'}
                {request.response_deadline
                  ? ` — until ${formatDeadline(request.response_deadline)}, then it expires on its own.`
                  : '.'}
              </span>
            </div>
          )}

          {/* flex-wrap + a min width rather than plain flex-1: a pending
              card carries four actions now, and four equal columns on a
              narrow screen squeezes each label past the point of being
              readable. They sit on one row where there is room and wrap
              onto two where there isn't. */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 min-w-[140px]"
              onClick={() => handleOpenDetails(request)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            {isOpenBooking(request) && (
              <Button
                variant="outline"
                className="flex-1 min-w-[140px]"
                render={<Link href={`/admin/booking-chats?booking=${request.id}`} />}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Chat
                {(unreadChats[String(request.id)] ?? 0) > 0 && (
                  <span className="ml-2 min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center">
                    {unreadChats[String(request.id)]}
                  </span>
                )}
              </Button>
            )}
            {variant === 'pending' && (
              <>
                <Button
                  className="flex-1 min-w-[140px] bg-primary hover:bg-primary/90 text-white"
                  onClick={() => handleConfirm(request)}
                  disabled={!!confirmBlockedBy}
                  title={confirmBlockedBy}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Confirm
                </Button>
                {/* Sits beside Decline, not inside it: no doctor on her
                    date is a scheduling problem, and answering it with a
                    refusal made her re-submit an entire application to
                    move one day. */}
                <Button
                  variant="outline"
                  className="flex-1 min-w-[180px] border-accent text-accent hover:bg-light-pink/30"
                  onClick={() => handleOpenPropose(request)}
                >
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Propose New Date
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 min-w-[140px]"
                  onClick={() => handleOpenDecline(request)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              </>
            )}
            {showPropose && (
              <Button
                variant="outline"
                className="flex-1 min-w-[180px] border-accent text-accent hover:bg-light-pink/30"
                onClick={() => handleOpenPropose(request)}
              >
                <CalendarPlus className="h-4 w-4 mr-2" />
                {request.current_sub_status === 'counter_offered' ? 'Propose Another Date' : 'Propose New Date'}
              </Button>
            )}
            {variant === 'confirmed' && request.current_sub_status === 'counter_offered' && (
              <Button
                variant="outline"
                className="flex-1 min-w-[140px]"
                onClick={() => handleOpenDecline(request)}
              >
                <X className="h-4 w-4 mr-2" />
                Decline
              </Button>
            )}
          </div>

          {/* Read-only on purpose. Moving a booking between phases, and
              recording the millilitres at the end of one, both belong to the
              Donor Process / Recipient Process queues now -- each of those
              screens shows one phase at a time, so staff act on a mother
              from the screen that describes what is actually happening to
              her. Keeping a second set of the same buttons here would let
              the same booking be advanced from two places with different
              surrounding context, which is how a stage gets ticked off
              before it has been done. */}
          {variant === 'confirmed' && (
            <div className="flex items-center gap-2 pt-2 text-accent text-sm font-medium">
              <Check className="h-4 w-4" />
              {bookingStatusLabel(request)}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-balance">Booking Requests</h1>
          <p className="text-muted-foreground mt-2">Confirm or decline donor screening and recipient requests</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog
        open={!!detailsRequest}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsRequest(null)
            setQuestionnaire(null)
            setQuestionnaireState('idle')
            if (photoUrl) URL.revokeObjectURL(photoUrl)
            setPhotoUrl(null)
            setPhotoState('idle')
          }
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailsRequest ? motherLabel(detailsRequest) : ''}</DialogTitle>
            <DialogDescription>
              {detailsRequest?.request_type === 'DONOR' ? 'Donor Screening' : 'Recipient Request'} &middot;{' '}
              {formatDateTime(detailsRequest?.preferred_date, detailsRequest?.preferred_time)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Booking */}
            <div className="space-y-2.5">
              <SectionHeading icon={Building2}>Booking</SectionHeading>
              <div className="space-y-1.5 pl-1">
                <div className="flex items-start justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Facility</span>
                  <span className="font-medium text-right shrink-0">{detailsRequest?.allocated_facility_name}</span>
                </div>
                <div className="flex items-start justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="border-primary/30 text-primary bg-light-pink/50 shrink-0">
                    {detailsRequest && bookingStatusLabel(detailsRequest)}
                  </Badge>
                </div>
                {detailsRequest?.staff_message && (
                  <div className="flex items-start justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Staff note</span>
                    <span className="font-medium text-right">{detailsRequest.staff_message}</span>
                  </div>
                )}
              </div>
            </div>

            {detailsRequest?.request_type === 'DONOR' && (
              <>
                <Separator />
                <CollectionMethodInfo request={detailsRequest} />
              </>
            )}

            {detailsRequest?.request_type === 'RECIPIENT' && (
              <>
                <Separator />
                <div className="space-y-2.5">
                  <SectionHeading icon={ListChecks}>Requirements</SectionHeading>
                  <div className="space-y-1.5 pl-1">
                    <div className="flex items-start justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Baby&apos;s name</span>
                      <span className="font-medium text-right shrink-0">
                        {detailsRequest.neonate_name || '—'}
                      </span>
                    </div>
                    <RequestedVolume
                      requestedMl={detailsRequest.requested_ml}
                      requestedBottles={detailsRequest.requested_bottles}
                      stock={stockByFacility[detailsRequest.allocated_facility]}
                      promised={promisedFor(detailsRequest)}
                      pending={detailsRequest.current_sub_status === 'pending'}
                    />
                    {detailsRequest.clinic_info && (
                      <div className="flex items-start justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">Clinic / doctor notes</span>
                        <span className="font-medium text-right">{detailsRequest.clinic_info}</span>
                      </div>
                    )}
                    {(
                      [
                        ['Prescription proof', detailsRequest.has_prescription_proof],
                        ['Has a cooler ready', detailsRequest.has_cooler],
                        ['Medical abstract', detailsRequest.has_medical_abstract],
                      ] as [string, boolean][]
                    ).map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-start justify-between gap-4 text-sm rounded-lg bg-muted/60 px-2.5 py-1.5"
                      >
                        <span className="text-muted-foreground">{label}</span>
                        <Badge
                          variant="outline"
                          className={
                            value
                              ? 'border-accent/40 text-accent bg-accent/10 shrink-0'
                              : 'border-border text-muted-foreground shrink-0'
                          }
                        >
                          {value ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {detailsRequest?.request_type === 'RECIPIENT' && detailsRequest?.needs_representative && (
              <>
                <Separator />
                <div className="space-y-2.5">
                  <SectionHeading icon={UserRound}>Pickup Representative</SectionHeading>
                  {detailsRequest.representative_purged_at ? (
                    <p className="pl-1 text-sm text-muted-foreground">
                      Details removed on{' '}
                      {new Date(detailsRequest.representative_purged_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      under the data-retention policy.
                    </p>
                  ) : (
                  <div className="space-y-1.5 pl-1">
                    <div className="flex items-start justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium shrink-0">{detailsRequest.representative_name || '—'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Birthday</span>
                      <span className="font-medium shrink-0">
                        {detailsRequest.representative_birthday
                          ? formatDateOnly(detailsRequest.representative_birthday)
                          : '—'}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Contact number</span>
                      <span className="font-medium shrink-0">
                        {detailsRequest.representative_contact_number || '—'}
                      </span>
                    </div>
                  </div>
                  )}
                </div>
              </>
            )}

            {detailsRequest?.request_type === 'DONOR' && (
              <>
                <Separator />
                <div className="space-y-2.5">
                  <SectionHeading icon={ClipboardList}>Donor Questionnaire</SectionHeading>
                  {questionnaireState === 'loading' && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2 pl-1">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading questionnaire...
                    </p>
                  )}
                  {questionnaireState === 'none' && (
                    <p className="text-sm text-muted-foreground pl-1">
                      {detailsRequest.owner_deleted
                        ? 'Her screening answers were deleted with her account.'
                        : isOpenBooking(detailsRequest)
                        ? "Her screening answers haven't arrived yet. She can send them again from Booking Status in her app."
                        : 'No screening answers were submitted.'}
                    </p>
                  )}
                  {questionnaireState === 'error' && (
                    <p className="text-sm text-destructive pl-1">Could not load questionnaire.</p>
                  )}
                  {questionnaireState === 'loaded' && questionnaire && (
                    <div className="space-y-1.5 pl-1">
                      {DONOR_QUESTIONNAIRE_FIELDS.map(([field, label]) => {
                        const value = questionnaire[field]
                        const isBoolean = typeof value === 'boolean'
                        return (
                          <div
                            key={field}
                            className="flex items-start justify-between gap-4 text-sm rounded-lg bg-muted/60 px-2.5 py-1.5"
                          >
                            <span className="text-muted-foreground">{label}</span>
                            {isBoolean ? (
                              <Badge
                                variant="outline"
                                className={
                                  value
                                    ? 'border-accent/40 text-accent bg-accent/10 shrink-0'
                                    : 'border-border text-muted-foreground shrink-0'
                                }
                              >
                                {value ? 'Yes' : 'No'}
                              </Badge>
                            ) : (
                              <span className="font-medium shrink-0">{String(value ?? '—')}</span>
                            )}
                          </div>
                        )
                      })}
                      {questionnaire.medication_details && (
                        <div className="flex items-start justify-between gap-4 text-sm rounded-lg bg-muted/60 px-2.5 py-1.5">
                          <span className="text-muted-foreground">Medications / supplements</span>
                          <span className="font-medium shrink-0">{String(questionnaire.medication_details)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {questionnaireState === 'loaded' && questionnaire && (
                  <>
                    <Separator />
                    <div className="space-y-2.5">
                      <SectionHeading icon={Camera}>Serology Photo</SectionHeading>
                      <div className="space-y-2 pl-1">
                        <p className="text-sm text-muted-foreground">
                          {questionnaire.photo_attached ? 'Attached' : 'Not attached'}
                        </p>
                        {questionnaire.photo_attached && photoState === 'loading' && (
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading photo...
                          </p>
                        )}
                        {questionnaire.photo_attached && photoState === 'error' && (
                          <p className="text-sm text-destructive">Could not load serology photo.</p>
                        )}
                        {questionnaire.photo_attached && photoState === 'loaded' && photoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photoUrl}
                            alt="Serology test photo"
                            className="max-w-full rounded-xl border border-border shadow-sm"
                          />
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* No phase actions here either -- see the comment on the
              confirmed card above. This dialog is for reading a booking,
              including the donor questionnaire and serology photo. */}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsRequest(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={!!declineRequest} onOpenChange={(open) => !open && setDeclineRequest(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Request</DialogTitle>
            <DialogDescription>
              Decline the request from {declineRequest ? motherLabel(declineRequest) : ''}
              {declineRequest?.current_sub_status === 'counter_offered'
                ? '. The date you proposed is withdrawn, and the request ends here.'
                : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Reason <span className="text-destructive">*</span>
              </label>
              <select
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a reason</option>
                {(declineRequest?.request_type === 'RECIPIENT' ? DESK_DECLINE_REASONS.recipient : DESK_DECLINE_REASONS.donor).map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Notes{' '}
                {declineReason === OTHER_REASON ? (
                  <span className="text-destructive">*</span>
                ) : (
                  <span className="font-normal text-muted-foreground">(Optional)</span>
                )}
              </label>
              <textarea
                value={declineNotes}
                onChange={(e) => setDeclineNotes(e.target.value)}
                placeholder={
                  declineReason === OTHER_REASON
                    ? 'Explain the reason in plain words — the mother reads this...'
                    : 'Additional details for this decline...'
                }
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
              />
              {declineReason && <p className="text-xs text-muted-foreground">{declineNotesHint(declineReason)}</p>}
              {declineReason === OTHER_REASON && !declineNotes.trim() && (
                <p className="text-xs text-destructive">
                  A reason is required when declining as &ldquo;Others&rdquo;.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineRequest(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={handleSubmitDecline}
              disabled={!declineReason || (declineReason === OTHER_REASON && !declineNotes.trim()) || isSubmitting}
            >
              {isSubmitting ? 'Declining...' : 'Decline Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Propose New Date (counter-offer) Dialog */}
      <ProposeDateDialog
        request={proposeRequest}
        onClose={() => setProposeRequest(null)}
        onProposed={handleProposed}
      />

      {isLoading && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading booking requests...
          </CardContent>
        </Card>
      )}

      {loadError && !isLoading && (
        <Card>
          <CardContent className="pt-6 text-center text-destructive">
            {loadError}
            <div className="pt-3">
              <Button variant="outline" onClick={loadRequests}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !loadError && (
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed ({confirmedRequests.length})</TabsTrigger>
            <TabsTrigger value="denied">Closed ({declinedRequests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-6">
            {pendingRequests.length > 0 ? (
              pendingRequests.map((request) => (
                <RequestCard key={request.id} request={request} variant="pending" />
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  {query ? 'No pending requests match your search' : 'No pending requests'}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="confirmed" className="space-y-6 mt-6">
            {confirmedRequests.length > 0 ? (
              groupByPhase(confirmedRequests).map(([phase, phaseRequests]) => (
                <div key={phase} className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {phase} ({phaseRequests.length})
                  </h3>
                  <div className="space-y-4">
                    {phaseRequests.map((request) => (
                      <RequestCard key={request.id} request={request} variant="confirmed" />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  {query ? 'No confirmed requests match your search' : 'No confirmed requests'}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="denied" className="space-y-4 mt-6">
            {declinedRequests.length > 0 ? (
              declinedRequests.map((request) => (
                <RequestCard key={request.id} request={request} variant="declined" />
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  {query ? 'No closed requests match your search' : 'No declined, expired or cancelled requests'}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
