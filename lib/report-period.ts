// lib/report-period.ts
//
// Report types and the period maths, with no other dependencies so both the
// page code (lib/reports.ts) and the PDF builder (lib/reports-pdf.ts) can use
// them without the PDF builder pulling in the API client.

import type { MilkBankRequest } from '@/lib/booking'

export type ReportSection = 'summary' | 'transactions' | 'users'

export type PeriodKind = 'this_month' | 'last_30_days' | 'this_year' | 'all_time' | 'custom'

export interface ReportPeriod {
  kind: PeriodKind
  /** yyyy-mm-dd, inclusive. Only used when kind is 'custom'. */
  from?: string
  /** yyyy-mm-dd, inclusive. Only used when kind is 'custom'. */
  to?: string
}

/** The facility record (GET /milkbank/facilities/<id>/) -- only what reports read. */
export interface FacilityRecord {
  id: number
  name: string
  address: string
  contact: string
  stock_level_ml: number
  capacity: number
  booked_count: number
  is_operational: boolean
}

/** A mother as GET /auth/users/ returns her (accounts.serializers.StaffUserListSerializer). */
export interface MotherRecord {
  id: number
  email: string
  mom_name: string
  total_drawn_ml: number
  total_received_ml: number
  date_joined: string
}

export const PERIOD_OPTIONS: { kind: PeriodKind; label: string }[] = [
  { kind: 'this_month', label: 'This month' },
  { kind: 'last_30_days', label: 'Last 30 days' },
  { kind: 'this_year', label: 'This year' },
  { kind: 'all_time', label: 'All time' },
  { kind: 'custom', label: 'Custom range' },
]

const localDay = (iso: string) => new Date(`${iso}T00:00:00`)

/**
 * The period as [start, end) instants in the browser's local time, or null
 * for an open end. Local, not UTC: "this month" in Manila must not start at
 * 8 AM on the 1st.
 */
export function periodRange(period: ReportPeriod, now: Date = new Date()): { start: Date | null; end: Date | null } {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (period.kind) {
    case 'this_month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: null }
    case 'last_30_days':
      return { start: new Date(startOfToday.getTime() - 29 * 86_400_000), end: null }
    case 'this_year':
      return { start: new Date(now.getFullYear(), 0, 1), end: null }
    case 'custom': {
      const start = period.from ? localDay(period.from) : null
      // `to` is inclusive, so the range ends at the start of the following day.
      const end = period.to ? new Date(localDay(period.to).getTime() + 86_400_000) : null
      return { start, end }
    }
    default:
      return { start: null, end: null }
  }
}

export function isValidPeriod(period: ReportPeriod): boolean {
  if (period.kind !== 'custom') return true
  if (!period.from || !period.to) return false
  return period.from <= period.to
}

const fmt = (date: Date) => date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

export function periodLabel(period: ReportPeriod, now: Date = new Date()): string {
  switch (period.kind) {
    case 'this_month':
      return `This month (${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`
    case 'last_30_days': {
      const { start } = periodRange(period, now)
      return `Last 30 days (${fmt(start!)} - ${fmt(now)})`
    }
    case 'this_year':
      return `This year (${now.getFullYear()})`
    case 'custom':
      return period.from && period.to ? `${fmt(localDay(period.from))} - ${fmt(localDay(period.to))}` : 'Custom range'
    default:
      return 'All time'
  }
}

function within(iso: string | null | undefined, period: ReportPeriod): boolean {
  const { start, end } = periodRange(period)
  if (!start && !end) return true
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  return (!start || t >= start.getTime()) && (!end || t < end.getTime())
}

/** Bookings submitted in the period (any status). */
export function bookingsInPeriod(requests: MilkBankRequest[], period: ReportPeriod): MilkBankRequest[] {
  return requests.filter((r) => within(r.submitted_at, period))
}

/** Bookings completed in the period -- by completed_at, when the transaction actually closed. */
export function completedInPeriod(requests: MilkBankRequest[], period: ReportPeriod): MilkBankRequest[] {
  return requests.filter((r) => r.current_sub_status === 'completed' && within(r.completed_at, period))
}
