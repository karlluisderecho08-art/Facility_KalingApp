'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, X, Mail, Building2, CalendarClock, Eye, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
}

interface DonorQuestionnaire {
  [key: string]: boolean | number | string
  photo_attached: boolean
  submitted_at: string
}

type QuestionnaireState = 'idle' | 'loading' | 'loaded' | 'none' | 'error'

const DECLINE_REASONS = ['No Available Doctor', 'Outdated Serological Test']

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
  const [advancingId, setAdvancingId] = useState<number | null>(null)

  const [completeRequest, setCompleteRequest] = useState<MilkBankRequest | null>(null)
  const [completeAmountOz, setCompleteAmountOz] = useState('')
  const [completeError, setCompleteError] = useState<string | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)

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

  const pendingRequests = requests.filter((r) => r.current_sub_status === 'pending')
  const declinedRequests = requests.filter((r) => ['declined', 'expired'].includes(r.current_sub_status))
  const confirmedRequests = requests.filter(
    (r) => !['pending', 'declined', 'expired'].includes(r.current_sub_status)
  )
  const confirmedByPhase = groupByPhase(confirmedRequests)

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

  const handleAdvanceStage = async (request: MilkBankRequest) => {
    setActionError(null)
    setAdvancingId(request.id)
    try {
      const res = await apiFetch(`/milkbank/requests/${request.id}/advance-stage/`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error((await res.json())?.detail || 'Could not advance this request')
      const updated = await res.json()
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      setDetailsRequest((prev) => (prev && prev.id === updated.id ? updated : prev))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not advance this request')
    } finally {
      setAdvancingId(null)
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

  const handleOpenComplete = (request: MilkBankRequest) => {
    setCompleteRequest(request)
    setCompleteAmountOz('')
    setCompleteError(null)
  }

  const handleSubmitComplete = async () => {
    if (!completeRequest) return
    const amount = parseFloat(completeAmountOz)
    if (!Number.isFinite(amount) || amount <= 0) {
      setCompleteError('Enter how many ounces before confirming.')
      return
    }
    setIsCompleting(true)
    setCompleteError(null)
    try {
      const res = await apiFetch(`/milkbank/requests/${completeRequest.id}/confirm-completion/`, {
        method: 'POST',
        body: JSON.stringify({ amount_oz: amount }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail || 'Could not mark this request as completed')
      const updated = await res.json()
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      setDetailsRequest((prev) => (prev && prev.id === updated.id ? updated : prev))
      setCompleteRequest(null)
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : 'Could not mark this request as completed')
    } finally {
      setIsCompleting(false)
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

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => handleOpenDetails(request)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            {variant === 'pending' && (
              <>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90 text-white"
                  onClick={() => handleConfirm(request)}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Confirm
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => handleOpenDecline(request)}>
                  <X className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              </>
            )}
          </div>

          {variant === 'confirmed' && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-accent text-sm font-medium">
                <Check className="h-4 w-4" />
                {STATUS_LABELS[request.current_sub_status] || request.current_sub_status}
              </div>
              {request.current_sub_status === 'scheduled' && request.current_stage_index < request.stages.length - 1 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleAdvanceStage(request)}
                  disabled={advancingId === request.id}
                >
                  {advancingId === request.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Mark {request.stages[request.current_stage_index + 1]} as done
                </Button>
              )}
              {request.current_sub_status === 'scheduled' &&
                request.current_stage_index >= request.stages.length - 1 && (
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-white"
                    onClick={() => handleOpenComplete(request)}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Confirm Completion
                  </Button>
                )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance">Booking Requests</h1>
        <p className="text-muted-foreground mt-2">Confirm or decline donor screening and recipient requests</p>
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

          <div className="space-y-6 py-2">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Booking</h3>
              <p className="text-sm text-muted-foreground">Facility: {detailsRequest?.allocated_facility_name}</p>
              <p className="text-sm text-muted-foreground">
                Status:{' '}
                {(detailsRequest && STATUS_LABELS[detailsRequest.current_sub_status]) ||
                  detailsRequest?.current_sub_status}
              </p>
              {detailsRequest?.staff_message && (
                <p className="text-sm text-muted-foreground">Staff note: {detailsRequest.staff_message}</p>
              )}
            </div>

            {detailsRequest?.request_type === 'RECIPIENT' && detailsRequest?.needs_representative && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Pickup Representative</h3>
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

            {detailsRequest?.request_type === 'DONOR' && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Donor Questionnaire</h3>
                {questionnaireState === 'loading' && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading questionnaire...
                  </p>
                )}
                {questionnaireState === 'none' && (
                  <p className="text-sm text-muted-foreground">No questionnaire submitted yet.</p>
                )}
                {questionnaireState === 'error' && (
                  <p className="text-sm text-destructive">Could not load questionnaire.</p>
                )}
                {questionnaireState === 'loaded' && questionnaire && (
                  <div className="space-y-2">
                    {DONOR_QUESTIONNAIRE_FIELDS.map(([field, label]) => (
                      <div key={field} className="flex items-start justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium shrink-0">
                          {typeof questionnaire[field] === 'boolean'
                            ? questionnaire[field]
                              ? 'Yes'
                              : 'No'
                            : String(questionnaire[field] ?? '—')}
                        </span>
                      </div>
                    ))}
                    {questionnaire.medication_details && (
                      <div className="flex items-start justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">Medications / supplements</span>
                        <span className="font-medium shrink-0">{String(questionnaire.medication_details)}</span>
                      </div>
                    )}
                    <div className="pt-2 space-y-2">
                      <p className="text-sm">
                        Serology photo: {questionnaire.photo_attached ? 'Attached' : 'Not attached'}
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
                          className="max-w-full rounded-lg border border-border"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            {detailsRequest?.current_sub_status === 'scheduled' &&
              detailsRequest.current_stage_index < detailsRequest.stages.length - 1 && (
                <Button
                  variant="outline"
                  onClick={() => detailsRequest && handleAdvanceStage(detailsRequest)}
                  disabled={advancingId === detailsRequest?.id}
                >
                  {advancingId === detailsRequest?.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Mark {detailsRequest.stages[detailsRequest.current_stage_index + 1]} as done
                </Button>
              )}
            {detailsRequest?.current_sub_status === 'scheduled' &&
              detailsRequest.current_stage_index >= detailsRequest.stages.length - 1 && (
                <Button
                  className="bg-primary hover:bg-primary/90 text-white"
                  onClick={() => detailsRequest && handleOpenComplete(detailsRequest)}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Confirm Completion
                </Button>
              )}
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
              <label className="text-sm font-medium">Notes (Optional)</label>
              <textarea
                value={declineNotes}
                onChange={(e) => setDeclineNotes(e.target.value)}
                placeholder="Additional details for this decline..."
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineRequest(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={handleSubmitDecline}
              disabled={!declineReason || isSubmitting}
            >
              {isSubmitting ? 'Declining...' : 'Decline Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Completion Dialog */}
      <Dialog open={!!completeRequest} onOpenChange={(open) => !open && setCompleteRequest(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Completion</DialogTitle>
            <DialogDescription>
              {completeRequest?.request_type === 'DONOR'
                ? 'Record how many ounces this mother donated. This adds to the facility’s milk stock.'
                : 'Record how many ounces were dispensed to this mother. This subtracts from the facility’s milk stock.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {completeRequest?.request_type === 'DONOR' ? 'Ounces produced' : 'Ounces dispensed'}{' '}
                <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={completeAmountOz}
                onChange={(e) => setCompleteAmountOz(e.target.value)}
                placeholder="e.g. 4.5"
                className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {completeError && <p className="text-sm text-destructive">{completeError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteRequest(null)} disabled={isCompleting}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={handleSubmitComplete}
              disabled={isCompleting}
            >
              {isCompleting ? 'Confirming...' : 'Confirm Completion'}
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
            <TabsTrigger value="declined">Declined ({declinedRequests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-6">
            {pendingRequests.length > 0 ? (
              pendingRequests.map((request) => (
                <RequestCard key={request.id} request={request} variant="pending" />
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">No pending requests</CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="confirmed" className="space-y-6 mt-6">
            {confirmedByPhase.length > 0 ? (
              confirmedByPhase.map(([phase, phaseRequests]) => (
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
                <CardContent className="pt-6 text-center text-muted-foreground">No confirmed requests</CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="declined" className="space-y-4 mt-6">
            {declinedRequests.length > 0 ? (
              declinedRequests.map((request) => (
                <RequestCard key={request.id} request={request} variant="declined" />
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">No declined requests</CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
