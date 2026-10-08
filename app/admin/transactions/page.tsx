'use client'

import { useCallback, useEffect, useState } from 'react'
import { Mail, Building2, CalendarCheck2, FileDown, Loader2, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { apiFetch } from '@/lib/api'
import {
  MilkBankRequest,
  formatAmount,
  formatCompletedAt,
  formatDateTime,
  isFinished,
} from '@/lib/booking'
import { generateReport } from '@/lib/reports'

// The one screen that shows a booking after it's done, from either
// pathway. Nothing here is actionable -- see the note on ProcessQueue's
// "advance"/"complete" actions for why a finished transaction has none: a
// completed request's stage_index sits permanently on "Results", so
// without isFinished() steering it here instead it would otherwise keep
// showing up in the Results queue forever with a "Record amount &
// complete" button that has nothing left to do.
export default function FinishedTransactionsPage() {
  const [requests, setRequests] = useState<MilkBankRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

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
  const finished = requests
    .filter(isFinished)
    .filter(
      (r) =>
        !query ||
        r.owner_name.toLowerCase().includes(query) ||
        r.owner_email.toLowerCase().includes(query)
    )
    // Most recently completed first -- completed_at is when the
    // transaction actually closed, not preferred_date (the appointment
    // slot), so two bookings for the same day still sort correctly.
    .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))

  // Exactly the list on screen, search included. For a dated period or a
  // combined report, use the Reports page.
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true)
    setPdfError(null)
    try {
      await generateReport({
        sections: ['transactions'],
        period: { kind: 'all_time' },
        requests: finished,
        filterNote: query ? `Filtered by search: "${searchTerm.trim()}"` : undefined,
      })
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Could not generate the PDF. Please try again.')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finished Transactions</h1>
          <p className="text-muted-foreground mt-1">
            Every completed donor and recipient booking, with the amount recorded when it closed.
          </p>
        </div>
        <Button
          onClick={handleDownloadPdf}
          disabled={isLoading || !!loadError || isGeneratingPdf}
          className="bg-primary hover:bg-primary/90 text-white shrink-0"
        >
          {isGeneratingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
          {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
        </Button>
      </div>

      {pdfError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {pdfError}
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

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
      ) : finished.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {query ? 'No finished transactions match that search.' : 'No transactions have been completed yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {finished.map((request) => (
            <Card key={request.id} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-lg">
                    {request.owner_name || request.owner_email}
                  </CardTitle>
                  <Badge variant={request.request_type === 'DONOR' ? 'default' : 'secondary'}>
                    {request.request_type === 'DONOR' ? 'Donor' : 'Recipient'}
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
                    <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
                    <span>Completed {formatCompletedAt(request.completed_at)}</span>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {request.request_type === 'DONOR' ? 'Amount donated' : 'Amount dispensed'}
                  </span>
                  <span className="text-lg font-semibold text-foreground">
                    {formatAmount(request.amount_ml)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
