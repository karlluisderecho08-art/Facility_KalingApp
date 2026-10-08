'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, Check, FileDown, Loader2, Receipt, Users, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'
import type { MilkBankRequest } from '@/lib/booking'
import {
  PERIOD_OPTIONS,
  type MotherRecord,
  type ReportPeriod,
  type ReportSection,
  bookingsInPeriod,
  completedInPeriod,
  generateReport,
  isValidPeriod,
  periodLabel,
} from '@/lib/reports'

// Reports: one place to pick a period and the sections to include, then
// download a single PDF. The Finished Transactions and User Records pages
// also carry their own "Download PDF" for exactly what they are showing;
// this page is for the periodic report that goes to a supervisor or a file.

const SECTIONS: { id: ReportSection; title: string; description: string; icon: LucideIcon }[] = [
  {
    id: 'summary',
    title: 'Facility Summary',
    description:
      'Current stock and capacity, milk received and dispensed, bookings by status, reasons for decline, and open recipient demand against stock.',
    icon: BarChart3,
  },
  {
    id: 'transactions',
    title: 'Finished Transactions',
    description: 'Every donor and recipient booking completed in the period, with the amount recorded and totals.',
    icon: Receipt,
  },
  {
    id: 'users',
    title: 'User Records',
    description:
      'Every registered mother with her lifetime donated and received totals. A snapshot as of today -- not limited to the period.',
    icon: Users,
  },
]

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>({ kind: 'this_month' })
  const [selected, setSelected] = useState<ReportSection[]>(['summary', 'transactions', 'users'])
  const [requests, setRequests] = useState<MilkBankRequest[] | null>(null)
  const [mothers, setMothers] = useState<MotherRecord[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  // Loaded once so the section cards can say how much each will contain;
  // the same data is then handed to the PDF, so what is previewed here is
  // exactly what gets printed.
  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const [r, u] = await Promise.all([apiFetch('/milkbank/requests/all/'), apiFetch('/auth/users/')])
      if (!r.ok) throw new Error(`Could not load bookings (${r.status}).`)
      if (!u.ok) throw new Error(`Could not load user records (${u.status}).`)
      setRequests(await r.json())
      setMothers(await u.json())
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load report data.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const validPeriod = isValidPeriod(period)
  const counts = useMemo(() => {
    if (!requests || !mothers || !validPeriod) return null
    return {
      summary: `${bookingsInPeriod(requests, period).length} booking(s) submitted in this period`,
      transactions: `${completedInPeriod(requests, period).length} transaction(s) completed in this period`,
      users: `${mothers.length} registered mother(s)`,
    } satisfies Record<ReportSection, string>
  }, [requests, mothers, period, validPeriod])

  const toggle = (id: ReportSection) =>
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((s) => s !== id)
        : // Keep the PDF's section order fixed, whatever order they were ticked in.
          SECTIONS.map((s) => s.id).filter((s) => s === id || prev.includes(s))
    )

  const handleGenerate = async () => {
    if (selected.length === 0 || !validPeriod) return
    setIsGenerating(true)
    setGenerateError(null)
    try {
      await generateReport({
        sections: selected,
        period,
        requests: requests ?? undefined,
        mothers: mothers ?? undefined,
      })
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Could not generate the PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const today = new Date()
  const todayIso = [
    today.getFullYear(),
    `${today.getMonth() + 1}`.padStart(2, '0'),
    `${today.getDate()}`.padStart(2, '0'),
  ].join('-')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-2">
          Generate a PDF report of your facility&apos;s activity, finished transactions and user records
        </p>
      </div>

      {loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive flex items-center justify-between gap-4">
          <span>{loadError}</span>
          <Button variant="outline" size="sm" onClick={load}>
            Try again
          </Button>
        </div>
      )}

      {/* Period */}
      <div className="bg-white rounded-[18px] border border-border p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Report period</h2>
          <p className="text-sm text-muted-foreground">Applies to the summary and to finished transactions.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Report period">
          {PERIOD_OPTIONS.map((option) => {
            const active = period.kind === option.kind
            return (
              <button
                key={option.kind}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPeriod((prev) => ({ ...prev, kind: option.kind }))}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  active
                    ? 'border-primary bg-light-pink text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
        {period.kind === 'custom' && (
          <div className="flex flex-wrap items-end gap-4">
            <label className="space-y-1.5">
              <span className="block text-sm font-medium text-muted-foreground">From</span>
              <Input
                type="date"
                value={period.from ?? ''}
                max={period.to || todayIso}
                onChange={(e) => setPeriod((prev) => ({ ...prev, from: e.target.value }))}
                className="w-44"
              />
            </label>
            <label className="space-y-1.5">
              <span className="block text-sm font-medium text-muted-foreground">To</span>
              <Input
                type="date"
                value={period.to ?? ''}
                min={period.from || undefined}
                max={todayIso}
                onChange={(e) => setPeriod((prev) => ({ ...prev, to: e.target.value }))}
                className="w-44"
              />
            </label>
          </div>
        )}
        <p className="text-sm text-foreground">
          {validPeriod ? (
            <>
              Reporting on: <span className="font-medium">{periodLabel(period)}</span>
            </>
          ) : (
            <span className="text-destructive">Choose a start date on or before the end date.</span>
          )}
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Include in the report</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {SECTIONS.map((section) => {
            const checked = selected.includes(section.id)
            const Icon = section.icon
            return (
              <button
                key={section.id}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggle(section.id)}
                className={`text-left bg-white rounded-[18px] border p-5 transition shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${
                  checked ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-light-pink text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                      checked ? 'border-primary bg-primary text-white' : 'border-border'
                    }`}
                  >
                    {checked && <Check className="h-3.5 w-3.5" />}
                  </span>
                </div>
                <p className="mt-3 font-semibold text-foreground">{section.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
                <p className="mt-3 text-xs font-medium text-accent">
                  {counts ? counts[section.id] : loadError ? '' : 'Loading...'}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || selected.length === 0 || !validPeriod}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
          {isGenerating ? 'Generating...' : 'Generate PDF'}
        </Button>
        <p className="text-sm text-muted-foreground">
          {selected.length === 0
            ? 'Select at least one section.'
            : `${selected.length} section${selected.length === 1 ? '' : 's'} selected`}
        </p>
      </div>

      {generateError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {generateError}
        </div>
      )}

      <p className="text-xs text-muted-foreground max-w-3xl">
        Reports contain mothers&apos; names and email addresses. Store and share them only as your facility&apos;s
        data-privacy policy allows.
      </p>
    </div>
  )
}
