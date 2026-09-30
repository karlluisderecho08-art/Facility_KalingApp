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

interface MilkBankRequest {
  id: number
  request_type: 'DONOR' | 'RECIPIENT'
  allocated_facility: number
  allocated_facility_name: string
  stages: string[]
  current_stage_index: number
  current_sub_status: keyof typeof STATUS_LABELS
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
  neonate_name: string
  clinic_info: string
  has_prescription_proof: boolean
  has_cooler: boolean
  has_medical_abstract: boolean
}

interface DonorQuestionnaire {
  [key: string]: boolean | number | string
  photo_attached: boolean
  submitted_at: string
}

type QuestionnaireState = 'idle' | 'loading' | 'loaded' | 'none' | 'error'

// "No Available Doctor" is deliberately NOT here any more. It was never
// really a reason to refuse a mother -- it is a reason to offer her a
// different day -- but as a decline it ended the request outright, and
// the only way back was submitting the whole thing again, questionnaire
// and serology photo included, to change a single date. It is now the
// "Propose New Date" button on each pending card instead, which sends a
// counter-offer she can accept in the app (see handleSubmitCounterOffer).
// What is left here is what a facility genuinely cannot work around.
const DECLINE_REASONS = ['Outdated Serological Test', 'Others']

// The mother's own scheduler offers exactly these, in this order
// (AllScreens.kt's timeSlots) -- staff must not be able to propose a slot
// her app would never have let her pick in the first place.
const TIME_SLOTS = [
  '8:00 AM', '9:00 AM', '10:00 AM',
  '11:00 AM', '12:00 PM', '1:00 PM',
  '2:00 PM', '3:00 PM', '4:00 PM',
  '5:00 PM',
]

// What the mother is told when a date is proposed. She reads this in the
// app's "Message from Facility Team" card, directly above the Accept /
// Choose New Time buttons -- without it the date simply moves with no
// explanation attached.
const NO_DOCTOR_MESSAGE =
  'No available doctor on your requested date — we have proposed a date when one is available.'

// Today in the browser's own timezone, as the yyyy-mm-dd that <input
// type="date"> wants for `min`. toISOString() would be wrong here: it
// converts to UTC first, so for anyone east of Greenwich (Manila is
// UTC+8) it still reads as yesterday for the first eight hours of the
// day, and would offer staff a date the backend counts as past.
function todayForDateInput(): string {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

// "Others" is the only reason that says nothing on its own. The reason and the
// notes are concatenated into the single `staff_message` the mother reads (see
// handleSubmitDecline), so picking "Others" with an empty notes box would send
// her the literal string "Others" and no explanation at all -- worse than not
// offering the option. So notes become mandatory the moment it is selected.
const OTHER_REASON = 'Others'

const STATUS_LABELS = {
  pending: 'Pending',
  awaiting_attendance: 'Awaiting Attendance',
  scheduled: 'Scheduled',
  counter_offered: 'Counter Offer Proposed',
  completed: 'Completed',
  declined: 'Declined',
  expired: 'Expired',
}

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
// e.g. Counseling and Testing sorts ahead of Breastmilk Analysis.
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
  return STATUS_LABELS[request.current_sub_status] || request.current_sub_status
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

  const [counterOfferRequest, setCounterOfferRequest] = useState<MilkBankRequest | null>(null)
  const [counterOfferDate, setCounterOfferDate] = useState('')
  const [counterOfferTime, setCounterOfferTime] = useState('')
  const [counterOfferNotes, setCounterOfferNotes] = useState('')

  const loadRequests = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const res = await apiFetch('/milkbank/requests/all/')
      if (!res.ok) throw new Error(`Failed to load requests (${res.status})`)
      setRequests(await res.json())
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
    !query ||
    r.owner_name.toLowerCase().includes(query) ||
    r.owner_email.toLowerCase().includes(query) ||
    r.allocated_facility_name.toLowerCase().includes(query)

  // Three buckets, and every request is in exactly one of them: this page
  // answers "was this booking approved?" and nothing else.
  //
  // It used to carry a fourth "Screening" tab, which was a view over the
  // confirmed set rather than a bucket of its own -- the work now lives in
  // the Donor Process and Recipient Process queues, where each phase gets a
  // screen that can actually act on it. Confirmed therefore lists everything
  // that was approved, wherever it has since reached, so this stays a
  // complete record of the decision rather than a partial one.
  const searchedRequests = requests.filter(matchesSearch)
  const pendingRequests = searchedRequests.filter((r) => r.current_sub_status === 'pending')
  const declinedRequests = searchedRequests.filter((r) => ['declined', 'expired'].includes(r.current_sub_status))
  const confirmedRequests = searchedRequests.filter(
    (r) => !['pending', 'declined', 'expired'].includes(r.current_sub_status)
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
    const staff_message = declineNotes ? `${declineReason} — ${declineNotes}` : declineReason
    try {
      const res = await apiFetch(`/milkbank/requests/${declineRequest.id}/decline/`, {
        method: 'POST',
        body: JSON.stringify({ staff_message }),
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

  const handleOpenCounterOffer = (request: MilkBankRequest) => {
    setCounterOfferRequest(request)
    setCounterOfferDate('')
    setCounterOfferTime('')
    setCounterOfferNotes('')
    setActionError(null)
  }

  /**
   * Offers the mother a different appointment instead of refusing her.
   *
   * The request stays alive the whole way through: it moves to
   * "Counter Offer Proposed" (still holding her slot at this facility,
   * with no countdown running against her), and in the app she gets
   * Accept or Choose New Time. Choosing a new time puts her back in this
   * desk's Pending tab with her new slot and everything she already
   * submitted still attached -- no re-application either way.
   */
  const handleSubmitCounterOffer = async () => {
    if (!counterOfferRequest || !counterOfferDate || !counterOfferTime) return
    setIsSubmitting(true)
    setActionError(null)
    const notes = counterOfferNotes.trim()
    const staff_message = notes ? `${NO_DOCTOR_MESSAGE} ${notes}` : NO_DOCTOR_MESSAGE
    try {
      const res = await apiFetch(`/milkbank/requests/${counterOfferRequest.id}/propose-counter-offer/`, {
        method: 'POST',
        body: JSON.stringify({
          counter_offer_date: counterOfferDate,
          counter_offer_time: counterOfferTime,
          staff_message,
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail || 'Could not propose a new date')
      const updated = await res.json()
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      setCounterOfferRequest(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not propose a new date')
    } finally {
      setIsSubmitting(false)
    }
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
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg">{request.owner_name || request.owner_email}</CardTitle>
                <Badge variant={request.request_type === 'DONOR' ? 'default' : 'secondary'}>
                  {request.request_type === 'DONOR' ? 'Donor Screening' : 'Recipient Request'}
                </Badge>
                {variant !== 'pending' && (
                  <Badge variant={variant === 'declined' ? 'destructive' : 'outline'}>
                    {STATUS_LABELS[request.current_sub_status] || request.current_sub_status}
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
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{request.owner_email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{request.allocated_facility_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <span>Submitted {new Date(request.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>

          {variant === 'declined' && request.staff_message && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Decline Reason</p>
              <p className="text-sm font-medium text-destructive">{request.staff_message}</p>
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
            {variant === 'pending' && (
              <>
                <Button
                  className="flex-1 min-w-[140px] bg-primary hover:bg-primary/90 text-white"
                  onClick={() => handleConfirm(request)}
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
                  className="flex-1 min-w-[140px] border-accent text-accent hover:bg-light-pink/30"
                  onClick={() => handleOpenCounterOffer(request)}
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
              {STATUS_LABELS[request.current_sub_status] || request.current_sub_status}
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
            placeholder="Search by mother, email, or facility..."
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
            <DialogTitle>{detailsRequest?.owner_name || detailsRequest?.owner_email}</DialogTitle>
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
                    {(detailsRequest && STATUS_LABELS[detailsRequest.current_sub_status]) ||
                      detailsRequest?.current_sub_status}
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
                    <p className="text-sm text-muted-foreground pl-1">No questionnaire submitted yet.</p>
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
              Decline the request from {declineRequest?.owner_name || declineRequest?.owner_email}
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
                {DECLINE_REASONS.map((reason) => (
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
                    ? 'Explain the reason -- the mother reads this...'
                    : 'Additional details for this decline...'
                }
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
              />
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
      <Dialog
        open={!!counterOfferRequest}
        onOpenChange={(open) => !open && setCounterOfferRequest(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Propose a New Date</DialogTitle>
            <DialogDescription>
              For when no doctor is available on the date{' '}
              {counterOfferRequest?.owner_name || counterOfferRequest?.owner_email} asked for. Her
              request stays open and everything she already submitted is kept — she just picks
              between this date and another time of her own.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
              <span className="text-muted-foreground">She asked for </span>
              <span className="font-medium">
                {formatDateTime(counterOfferRequest?.preferred_date, counterOfferRequest?.preferred_time)}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Date a doctor is available <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={counterOfferDate}
                min={todayForDateInput()}
                onChange={(e) => setCounterOfferDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Time <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setCounterOfferTime(slot)}
                    className={
                      counterOfferTime === slot
                        ? 'rounded-lg border border-primary bg-primary text-white text-sm py-2 font-medium'
                        : 'rounded-lg border border-border bg-background text-sm py-2 hover:bg-light-pink/30'
                    }
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Notes <span className="font-normal text-muted-foreground">(Optional)</span>
              </label>
              <textarea
                value={counterOfferNotes}
                onChange={(e) => setCounterOfferNotes(e.target.value)}
                placeholder="Anything else she should know — the mother reads this..."
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                She is told a doctor was not available on her date whether or not you add notes.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCounterOfferRequest(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={handleSubmitCounterOffer}
              disabled={!counterOfferDate || !counterOfferTime || isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send to Mother'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <TabsTrigger value="denied">Denied ({declinedRequests.length})</TabsTrigger>
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
                  {query ? 'No denied requests match your search' : 'No denied requests'}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
