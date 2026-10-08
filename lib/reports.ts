// lib/reports.ts
//
// What the Reports page and the per-page "Download PDF" buttons share:
// the report period, the data a report is built from, and the one function
// that loads jsPDF on demand and saves the file.

import { apiFetch, getMe } from '@/lib/api'
import type { MilkBankRequest } from '@/lib/booking'
import type { FacilityRecord, MotherRecord, ReportPeriod, ReportSection } from '@/lib/report-period'

export * from '@/lib/report-period'

interface ReportContext {
  facility: FacilityRecord | null
  facilityName: string
  preparedBy: string
}

/** Who is generating the report and for which facility -- read fresh each time. */
async function loadContext(): Promise<ReportContext> {
  const me = await getMe()
  const facilityId = typeof me?.facility === 'number' ? me.facility : null
  let facility: FacilityRecord | null = null
  if (facilityId !== null) {
    try {
      const res = await apiFetch(`/milkbank/facilities/${facilityId}/`)
      if (res.ok) facility = await res.json()
    } catch {
      // The report still works without it; the summary just shows stock as unavailable.
    }
  }
  return {
    facility,
    facilityName: facility?.name || (typeof me?.facility_name === 'string' ? me.facility_name : '') || 'Facility',
    preparedBy: me?.email ?? '',
  }
}

async function fetchJson<T>(path: string, what: string): Promise<T> {
  const res = await apiFetch(path)
  if (!res.ok) throw new Error(`Could not load ${what} (${res.status}).`)
  return res.json()
}

export interface GenerateOptions {
  sections: ReportSection[]
  period: ReportPeriod
  /** Pass what the page already loaded (e.g. a searched list) to report exactly that. */
  requests?: MilkBankRequest[]
  mothers?: MotherRecord[]
  filterNote?: string
}

/** Loads whatever the chosen sections need, builds the PDF and saves it. */
export async function generateReport(options: GenerateOptions): Promise<void> {
  const needsRequests = options.sections.some((s) => s === 'summary' || s === 'transactions')
  const needsMothers = options.sections.includes('users')

  const [context, requests, mothers, pdf] = await Promise.all([
    loadContext(),
    options.requests ?? (needsRequests ? fetchJson<MilkBankRequest[]>('/milkbank/requests/all/', 'bookings') : []),
    options.mothers ?? (needsMothers ? fetchJson<MotherRecord[]>('/auth/users/', 'user records') : []),
    import('@/lib/reports-pdf'),
  ])

  const generatedAt = new Date()
  const doc = pdf.buildReportPdf(
    { ...context, sections: options.sections, period: options.period, requests, mothers, filterNote: options.filterNote },
    generatedAt
  )

  // Local date, not toISOString() (UTC): before 8 AM in Manila that would
  // stamp the file with yesterday's date.
  const stamp = [
    generatedAt.getFullYear(),
    `${generatedAt.getMonth() + 1}`.padStart(2, '0'),
    `${generatedAt.getDate()}`.padStart(2, '0'),
  ].join('-')
  const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const kind = options.sections.length === 1 ? options.sections[0] : 'facility-report'
  doc.save(`kalingapp-${slug(context.facilityName) || 'facility'}-${kind}-${stamp}.pdf`)
}
