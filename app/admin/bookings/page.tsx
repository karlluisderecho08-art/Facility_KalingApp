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
  ['currently_lactating_excess', 'Currently lactating and producing milk beyond own infant’s needs'],
  ['infant_age_months', 'Age of donor’s own infant (months)'],
  ['consents_to_screening', 'Consents to blood screening and voluntary donation'],
  ['good_general_health', 'In good general health'],
  ['being_treated_for_illness', 'Being treated for any acute or chronic illness'],
  ['recent_fever_or_infection', 'Fever or active infection in the past week'],
  ['tested_positive_infectious_disease', 'Ever tested positive for HIV/HTLV/Hepatitis/syphilis'],
  ['partner_tested_positive_or_at_risk', 'Partner tested positive for, or at risk of, HIV/hepatitis'],
  ['recent_blood_transfusion', 'Blood transfusion in the past 12 months'],
  ['recent_tattoo_piercing_needle_exposure', 'Tattoo, piercing, or needle-stick exposure in the past 12 months'],
  ['travel_to_risk_area', 'Traveled to/lived in a disease-risk area'],
  ['smokes_or_tobacco', 'Smokes or uses tobacco'],
  ['drinks_alcohol', 'Drinks alcohol'],
  ['uses_illicit_drugs', 'Uses illicit drugs'],
  ['on_prescription_medications', 'On prescription medications'],
  ['uses_herbal_supplements', 'Uses herbal supplements or megadose vitamins'],
  ['uses_radioactive_or_radiologic', 'Radioactive substances or radiologic treatment'],
  ['vegan_without_b12', 'Vegan diet without B12 supplementation'],
  ['recent_live_virus_vaccine', 'Recently received a live-virus vaccine'],
]

function formatDateTime(preferredDate: string | undefined, preferredTime: string | undefined) {
  if (!preferredDate) return preferredTime || ''
  const d = new Date(`${preferredDate}T00:00:00`)
  const dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  return preferredTime ? `${dateStr} · ${preferredTime}` : dateStr
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

  const [declineRequest, setDeclineRequest] = useState<MilkBankRequest | null>(null)
  const [declineReason, setDeclineReason] = useState('')
  const [declineNotes, setDeclineNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

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

  const handleOpenDetails = async (request: MilkBankRequest) => {
    setDetailsRequest(request)
    if (request.request_type !== 'DONOR') {
      setQuestionnaireState('none')
      setQuestionnaire(null)
      return
    }
    setQuestionnaireState('loading')
    setQuestionnaire(null)
    try {
      const res = await apiFetch(`/milkbank/requests/${request.id}/donor-questionnaire/`)
      if (res.status === 404) {
        setQuestionnaireState('none')
        return
      }
      if (!res.ok) throw new Error()
      setQuestionnaire(await res.json())
      setQuestionnaireState('loaded')
    } catch {
      setQuestionnaireState('error')
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
            <div className="flex items-center gap-2 text-accent text-sm font-medium pt-2">
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
                    <p className="text-sm pt-2">
                      Serology photo: {questionnaire.photo_attached ? 'Attached' : 'Not attached'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

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

          <TabsContent value="confirmed" className="space-y-4 mt-6">
            {confirmedRequests.length > 0 ? (
              confirmedRequests.map((request) => (
                <RequestCard key={request.id} request={request} variant="confirmed" />
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
