'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Mail, Building2, CalendarClock, Loader2, Search, Hourglass } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  MilkBankRequest,
  STATUS_LABELS,
  formatDateTime,
  formatSubmitted,
  isOnStage,
} from '@/lib/booking'

/**
 * What staff can do to a request sitting on this queue's stage.
 *
 *   advance   Tick the stage off and move the mother forward. Every stage
 *             that uses this is an APPROVE-ONLY gate -- there is no reject
 *             button anywhere in the Donor/Recipient Process, by design.
 *             A booking is refused once, at the Booking Request desk; past
 *             that point the facility is working WITH her, not screening
 *             her again, and a decline here would strand a mother who has
 *             already been told she was accepted.
 *
 *   complete  The final stage. Staff record the millilitres that actually
 *             changed hands, which closes the booking and moves facility
 *             stock (up for a donor, down for a recipient).
 *
 *   wait      Nothing for staff to do -- the mother has the next move.
 *             The queue still lists her so the facility can see who it is
 *             waiting on, but offers no button that would pretend
 *             otherwise.
 */
export type ProcessAction = 'advance' | 'complete' | 'wait'

interface ProcessQueueProps {
  requestType: 'DONOR' | 'RECIPIENT'
  stage: string
  title: string
  description: string
  action: ProcessAction
  /** Button text for `advance`. Says what actually happens next, not "Next". */
  advanceLabel?: string
  /** Field label for `complete` -- differs for milk drawn vs milk dispensed. */
  amountLabel?: string
  /** One line under the amount field explaining which way stock moves. */
  amountHelp?: string
  /** Shown instead of a button for `wait`. */
  waitingNote?: string
}

export function ProcessQueue({
  requestType,
  stage,
  title,
  description,
  action,
  advanceLabel = 'Approve & proceed',
  amountLabel = 'Millilitres (mL)',
  amountHelp,
  waitingNote = 'Waiting on the mother. Nothing to do here until she acts.',
}: ProcessQueueProps) {
  const [requests, setRequests] = useState<MilkBankRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [advancingId, setAdvancingId] = useState<number | null>(null)

  const [completeRequest, setCompleteRequest] = useState<MilkBankRequest | null>(null)
  const [completeAmountMl, setCompleteAmountMl] = useState('')
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

  const query = searchTerm.trim().toLowerCase()
  const visible = requests
    .filter((r) => isOnStage(r, requestType, stage))
    .filter(
      (r) =>
        !query ||
        r.owner_name.toLowerCase().includes(query) ||
        r.owner_email.toLowerCase().includes(query)
    )
    .sort((a, b) => a.preferred_date.localeCompare(b.preferred_date))

  const handleAdvance = async (request: MilkBankRequest) => {
    setActionError(null)
    setAdvancingId(request.id)
    try {
      const res = await apiFetch(`/milkbank/requests/${request.id}/advance-stage/`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error((await res.json())?.detail || 'Could not move this request forward')
      const updated = await res.json()
      // The row leaves this queue the moment it lands on the next stage --
      // replacing it in place (rather than refetching) keeps that instant.
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not move this request forward')
    } finally {
      setAdvancingId(null)
    }
  }

  const handleSubmitComplete = async () => {
    if (!completeRequest) return
    // Whole millilitres only -- the backend stores stock as an integer count
    // of mL and rejects a fraction, so catch it here rather than surfacing a
    // serializer error.
    const amount = Number(completeAmountMl)
    if (!Number.isInteger(amount) || amount <= 0) {
      setCompleteError('Enter how many millilitres (a whole number) before confirming.')
      return
    }
    setIsCompleting(true)
    setCompleteError(null)
    try {
      const res = await apiFetch(`/milkbank/requests/${completeRequest.id}/confirm-completion/`, {
        method: 'POST',
        body: JSON.stringify({ amount_ml: amount }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail || 'Could not complete this booking')
      const updated = await res.json()
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      setCompleteRequest(null)
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : 'Could not complete this booking')
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {actionError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">{actionError}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading…</span>
        </div>
      ) : loadError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button variant="outline" size="sm" onClick={loadRequests}>
            Try again
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {query
                ? 'No one on this phase matches that search.'
                : 'Nobody is on this phase right now.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((request) => (
            <Card key={request.id} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-lg">
                    {request.owner_name || request.owner_email}
                  </CardTitle>
                  <Badge variant={request.request_type === 'DONOR' ? 'default' : 'secondary'}>
                    {request.request_type === 'DONOR' ? 'Donor' : 'Recipient'}
                  </Badge>
                  <Badge variant="outline">
                    {STATUS_LABELS[request.current_sub_status] || request.current_sub_status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(request.preferred_date, request.preferred_time)}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
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
                    <span>Submitted {formatSubmitted(request.submitted_at)}</span>
                  </div>
                </div>

                {request.needs_representative && request.representative_name && (
                  <div className="rounded-lg border border-border p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Pickup representative</p>
                    <p className="text-sm font-medium">{request.representative_name}</p>
                    {request.representative_contact_number && (
                      <p className="text-sm text-muted-foreground">
                        {request.representative_contact_number}
                      </p>
                    )}
                  </div>
                )}

                {action === 'advance' && (
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-white"
                    onClick={() => handleAdvance(request)}
                    disabled={advancingId === request.id}
                  >
                    {advancingId === request.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    {advanceLabel}
                  </Button>
                )}

                {action === 'complete' && (
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-white"
                    onClick={() => {
                      setCompleteRequest(request)
                      setCompleteAmountMl('')
                      setCompleteError(null)
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Record amount &amp; complete
                  </Button>
                )}

                {action === 'wait' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-lg border border-border border-dashed p-3">
                    <Hourglass className="h-4 w-4 shrink-0" />
                    <span>{waitingNote}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={completeRequest !== null} onOpenChange={(open) => !open && setCompleteRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record the amount</DialogTitle>
            <DialogDescription>
              {completeRequest?.owner_name || completeRequest?.owner_email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">{amountLabel}</label>
            <Input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              placeholder="e.g. 120"
              value={completeAmountMl}
              onChange={(e) => setCompleteAmountMl(e.target.value)}
            />
            {amountHelp && <p className="text-xs text-muted-foreground">{amountHelp}</p>}
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
              {isCompleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm completion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
