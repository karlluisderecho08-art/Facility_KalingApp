// lib/reports-pdf.ts
//
// Builds the facility's downloadable PDF reports: a Facility Summary, the
// Finished Transactions list and the User Records list, in any combination.
//
// Drawn directly with jsPDF from the same API payloads the pages render,
// the same approach as the admin platform's Statistics PDF
// (admin/lib/statistics-pdf.ts): one fixed A4 layout whatever the screen,
// real selectable text, and tables that carry their header row onto every
// page they continue on.
//
// Only imported on demand (see generateReport in lib/reports.ts), so jsPDF
// is not part of the bundle staff download just to open a page.

import { jsPDF } from 'jspdf'
import { STATUS_LABELS, type BookingStatus, type MilkBankRequest } from '@/lib/booking'
import {
  type FacilityRecord,
  type MotherRecord,
  type ReportPeriod,
  type ReportSection,
  bookingsInPeriod,
  completedInPeriod,
  periodLabel,
} from '@/lib/report-period'

// Millimetres on A4 portrait.
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 15
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const FOOTER_HEIGHT = 9
const SECTION_GAP = 8

// Same colours as the dashboard (app/globals.css). Text is always INK or
// MUTED -- pink on white is too faint to read as text.
const INK = '#333333'
const MUTED = '#666666'
const PRIMARY = '#F56C98'
const ACCENT = '#D4A437'
const RULE = '#E6E1DD'
const ZEBRA = '#FAF7F5'
const HEADER_FILL = '#FDEEF3'

export interface ReportInput {
  sections: ReportSection[]
  period: ReportPeriod
  facility: FacilityRecord | null
  facilityName: string
  preparedBy: string
  requests: MilkBankRequest[]
  mothers: MotherRecord[]
  /** Set when the report is a page's own filtered list (e.g. a search), so the PDF says so. */
  filterNote?: string
}

const SECTION_TITLES: Record<ReportSection, string> = {
  summary: 'Facility Summary',
  transactions: 'Finished Transactions',
  users: 'User Records',
}

function rgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

/**
 * jsPDF's built-in fonts only cover Latin-1 (so "ñ" in a Filipino name is
 * fine). Anything else -- an em dash, a curly quote, an emoji in a name, the
 * narrow no-break space browsers put before "AM" -- would print as a stray
 * symbol, so it is mapped to a plain equivalent or dropped here, once, for
 * every string that reaches the page.
 */
export function pdfSafe(value: string): string {
  return value
    .replace(/[\u00a0\u2007\u2009\u202f]/g, ' ')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/[^\x00-\xff]/g, '')
    // A dropped character can leave a double space ("Joy  Reyes").
    .replace(/ {2,}/g, ' ')
}

const ml = (value: number | null | undefined) =>
  value === null || value === undefined ? '-' : `${value.toLocaleString('en-US')} mL`

const count = (value: number) => value.toLocaleString('en-US')

const shortDate = (iso: string | null | undefined) => {
  if (!iso) return '-'
  // A bare date ("2026-10-09") is a calendar day, not an instant: parse it
  // as local midnight so it can't slip to the previous day.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

interface Column<Row> {
  header: string
  width: number // fraction of CONTENT_WIDTH
  align?: 'left' | 'right'
  value: (row: Row) => string
  bold?: boolean
}

export function buildReportPdf(input: ReportInput, generatedAt: Date = new Date()): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const title =
    input.sections.length === 1 ? `${SECTION_TITLES[input.sections[0]]} Report` : 'Facility Report'
  doc.setProperties({
    title: pdfSafe(`KalingApp - ${input.facilityName} - ${title}`),
    creator: 'KalingApp Facility Dashboard',
  })

  let y = MARGIN

  const text = (
    value: string,
    x: number,
    baseline: number,
    options: { size: number; color?: string; bold?: boolean; align?: 'left' | 'center' | 'right' }
  ) => {
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal')
    doc.setFontSize(options.size)
    doc.setTextColor(...rgb(options.color ?? INK))
    doc.text(pdfSafe(value), x, baseline, { align: options.align ?? 'left' })
  }

  /** Shortens text with "..." so it can never run into the next column. */
  const fit = (raw: string, maxWidth: number, size: number, bold = false): string => {
    const value = pdfSafe(raw)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    if (doc.getTextWidth(value) <= maxWidth) return value
    let shortened = value
    while (shortened.length > 1 && doc.getTextWidth(`${shortened}...`) > maxWidth) {
      shortened = shortened.slice(0, -1)
    }
    return `${shortened.trimEnd()}...`
  }

  const bottom = () => PAGE_HEIGHT - MARGIN - FOOTER_HEIGHT

  /** Starts a new page when the next block would not fit whole on this one. */
  const ensureSpace = (height: number) => {
    if (y + height > bottom()) {
      doc.addPage()
      y = MARGIN
    }
  }

  // Reserves room for the heading AND the first block under it (a row of
  // tiles plus a few table rows), so a heading is never left alone at the
  // foot of a page with its content starting overleaf.
  const sectionHeading = (heading: string, subtitle: string) => {
    ensureSpace(17 + 25 + 7.2 + 6.4 * 3)
    text(heading, MARGIN, y + 5, { size: 13, bold: true })
    text(fit(subtitle, CONTENT_WIDTH, 8.5), MARGIN, y + 10, { size: 8.5, color: MUTED })
    doc.setDrawColor(...rgb(PRIMARY))
    doc.setLineWidth(0.4)
    doc.line(MARGIN, y + 12.5, MARGIN + 18, y + 12.5)
    y += 17
  }

  const subHeading = (heading: string) => {
    ensureSpace(14)
    text(heading, MARGIN, y + 4, { size: 10, bold: true })
    y += 7
  }

  const note = (value: string) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const lines = doc.splitTextToSize(pdfSafe(value), CONTENT_WIDTH) as string[]
    ensureSpace(lines.length * 3.6 + 2)
    lines.forEach((line, index) => text(line, MARGIN, y + 3 + index * 3.6, { size: 8, color: MUTED }))
    y += lines.length * 3.6 + 2
  }

  /** Metric tiles, wrapping onto as many rows as needed. */
  const tiles = (items: { label: string; value: string; caption?: string }[], perRow = 3) => {
    const gap = 4
    const width = (CONTENT_WIDTH - gap * (perRow - 1)) / perRow
    const height = 21
    for (let start = 0; start < items.length; start += perRow) {
      ensureSpace(height + gap)
      items.slice(start, start + perRow).forEach((item, index) => {
        const x = MARGIN + index * (width + gap)
        doc.setDrawColor(...rgb(RULE))
        doc.setLineWidth(0.3)
        doc.roundedRect(x, y, width, height, 2.5, 2.5, 'S')
        text(fit(item.label, width - 8, 8), x + 4, y + 5.8, { size: 8, color: MUTED })
        text(fit(item.value, width - 8, 15, true), x + 4, y + 13.2, { size: 15, bold: true })
        if (item.caption) text(fit(item.caption, width - 8, 7), x + 4, y + 18, { size: 7, color: MUTED })
      })
      y += height + gap
    }
  }

  /**
   * A table that repeats its header row on every page it continues onto and
   * shades alternate rows, so a long list stays readable once printed.
   */
  const table = <Row,>(columns: Column<Row>[], rows: Row[], empty: string, totals?: string[]) => {
    const rowHeight = 6.4
    const headerHeight = 7.2
    const pad = 2
    const widths = columns.map((c) => c.width * CONTENT_WIDTH)
    const xs = widths.map((_, i) => MARGIN + widths.slice(0, i).reduce((a, b) => a + b, 0))

    const cell = (value: string, i: number, baseline: number, size: number, bold: boolean, color = INK) => {
      const align = columns[i].align ?? 'left'
      const x = align === 'right' ? xs[i] + widths[i] - pad : xs[i] + pad
      text(fit(value, widths[i] - pad * 2, size, bold), x, baseline, { size, bold, color, align })
    }

    const header = () => {
      doc.setFillColor(...rgb(HEADER_FILL))
      doc.rect(MARGIN, y, CONTENT_WIDTH, headerHeight, 'F')
      columns.forEach((c, i) => cell(c.header, i, y + 4.9, 8, true))
      y += headerHeight
    }

    ensureSpace(headerHeight + rowHeight * Math.min(3, Math.max(1, rows.length)))
    header()

    if (rows.length === 0) {
      text(empty, MARGIN + pad, y + 4.6, { size: 8.5, color: MUTED })
      y += rowHeight + 2
      return
    }

    rows.forEach((row, index) => {
      if (y + rowHeight > bottom()) {
        doc.addPage()
        y = MARGIN
        header()
      }
      if (index % 2 === 1) {
        doc.setFillColor(...rgb(ZEBRA))
        doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight, 'F')
      }
      columns.forEach((c, i) => cell(c.value(row), i, y + 4.4, 8, c.bold ?? false))
      y += rowHeight
    })

    doc.setDrawColor(...rgb(RULE))
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)

    if (totals) {
      if (y + rowHeight > bottom()) {
        doc.addPage()
        y = MARGIN
      }
      totals.forEach((value, i) => value && cell(value, i, y + 4.6, 8, true))
      y += rowHeight
    }
    y += 2
  }

  // --- Header ---------------------------------------------------------------
  text('KALINGAPP FACILITY REPORT', MARGIN, y + 3, { size: 8.5, color: MUTED, bold: true })
  text(fit(input.facilityName, CONTENT_WIDTH, 18, true), MARGIN, y + 11.5, { size: 18, bold: true })
  text(title, MARGIN, y + 18, { size: 11, color: INK })
  const meta = [
    `Period: ${periodLabel(input.period)}`,
    `Generated ${generatedAt.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}`,
    input.preparedBy ? `Prepared by ${input.preparedBy}` : '',
  ].filter(Boolean)
  text(fit(meta.join('   |   '), CONTENT_WIDTH, 8.5), MARGIN, y + 23.5, { size: 8.5, color: MUTED })
  doc.setDrawColor(...rgb(PRIMARY))
  doc.setLineWidth(0.7)
  doc.line(MARGIN, y + 27, MARGIN + CONTENT_WIDTH, y + 27)
  y += 27 + SECTION_GAP
  if (input.filterNote) {
    note(input.filterNote)
    y += 2
  }

  const periodBookings = bookingsInPeriod(input.requests, input.period)
  const periodCompleted = completedInPeriod(input.requests, input.period)

  input.sections.forEach((section, sectionIndex) => {
    if (sectionIndex > 0) y += SECTION_GAP

    // --- Facility Summary ---------------------------------------------------
    if (section === 'summary') {
      sectionHeading(
        'Facility Summary',
        `Stock and capacity as of now. Booking activity: ${periodLabel(input.period)}.`
      )

      const donated = periodCompleted
        .filter((r) => r.request_type === 'DONOR')
        .reduce((sum, r) => sum + (r.amount_ml ?? 0), 0)
      const dispensed = periodCompleted
        .filter((r) => r.request_type === 'RECIPIENT')
        .reduce((sum, r) => sum + (r.amount_ml ?? 0), 0)
      const openRecipient = input.requests.filter(
        (r) =>
          r.request_type === 'RECIPIENT' &&
          ['pending', 'awaiting_attendance', 'scheduled', 'counter_offered'].includes(r.current_sub_status)
      )
      const demand = openRecipient.reduce((sum, r) => sum + (r.requested_ml ?? 0), 0)
      const stock = input.facility?.stock_level_ml

      tiles([
        {
          label: 'Current milk stock',
          value: ml(stock),
          caption: input.facility ? 'As of this report' : 'Facility record unavailable',
        },
        {
          label: 'Booking slots in use',
          value: input.facility ? `${count(input.facility.booked_count)} / ${count(input.facility.capacity)}` : '-',
          caption: input.facility
            ? input.facility.is_operational
              ? 'Open for bookings'
              : 'Marked not operational'
            : '',
        },
        {
          label: 'Open recipient demand',
          value: ml(demand),
          caption: `${count(openRecipient.length)} open request${openRecipient.length === 1 ? '' : 's'}${
            stock !== undefined && demand > stock ? ' - exceeds stock' : ''
          }`,
        },
        { label: 'Bookings submitted', value: count(periodBookings.length), caption: 'In this period' },
        {
          label: 'Milk received (donations)',
          value: ml(donated),
          caption: `${count(periodCompleted.filter((r) => r.request_type === 'DONOR').length)} completed donation(s)`,
        },
        {
          label: 'Milk dispensed (recipients)',
          value: ml(dispensed),
          caption: `${count(periodCompleted.filter((r) => r.request_type === 'RECIPIENT').length)} completed pickup(s)`,
        },
      ])

      // Status breakdown, donors and recipients side by side.
      subHeading('Bookings by status')
      const statuses = Object.keys(STATUS_LABELS) as BookingStatus[]
      const byStatus = (type: 'DONOR' | 'RECIPIENT', status: BookingStatus) =>
        periodBookings.filter((r) => r.request_type === type && r.current_sub_status === status).length
      const statusRows = statuses
        .map((status) => ({
          status,
          donor: byStatus('DONOR', status),
          recipient: byStatus('RECIPIENT', status),
        }))
        .filter((row) => row.donor + row.recipient > 0)
      const donorTotal = statusRows.reduce((s, r) => s + r.donor, 0)
      const recipientTotal = statusRows.reduce((s, r) => s + r.recipient, 0)
      table(
        [
          { header: 'Status', width: 0.4, value: (r) => STATUS_LABELS[r.status] },
          { header: 'Donor', width: 0.2, align: 'right', value: (r) => count(r.donor) },
          { header: 'Recipient', width: 0.2, align: 'right', value: (r) => count(r.recipient) },
          { header: 'Total', width: 0.2, align: 'right', bold: true, value: (r) => count(r.donor + r.recipient) },
        ],
        statusRows,
        'No bookings were submitted in this period.',
        statusRows.length
          ? ['Total', count(donorTotal), count(recipientTotal), count(donorTotal + recipientTotal)]
          : undefined
      )
      note('Each booking is counted once, under the status it is in today, if it was submitted in this period.')
      y += 3

      // Decline reasons.
      const declined = periodBookings.filter((r) => r.current_sub_status === 'declined')
      const reasonCounts = new Map<string, number>()
      declined.forEach((r) => {
        const reason = r.decline_reason?.trim() || 'Not specified'
        reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1)
      })
      const reasons = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])
      subHeading('Reasons for decline')
      table(
        [
          { header: 'Reason', width: 0.7, value: (r) => r[0] },
          { header: 'Bookings', width: 0.15, align: 'right', value: (r) => count(r[1]) },
          {
            header: 'Share',
            width: 0.15,
            align: 'right',
            value: (r) => {
              const percent = Math.round((r[1] / declined.length) * 100)
              return `${percent === 0 ? '<1' : percent}%`
            },
          },
        ],
        reasons,
        'No bookings were declined in this period.'
      )
    }

    // --- Finished Transactions ----------------------------------------------
    if (section === 'transactions') {
      const rows = [...periodCompleted].sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))
      const donors = rows.filter((r) => r.request_type === 'DONOR')
      const recipients = rows.filter((r) => r.request_type === 'RECIPIENT')
      const donated = donors.reduce((s, r) => s + (r.amount_ml ?? 0), 0)
      const dispensed = recipients.reduce((s, r) => s + (r.amount_ml ?? 0), 0)

      sectionHeading(
        'Finished Transactions',
        `Completed donor and recipient bookings, newest first. Completed: ${periodLabel(input.period)}.`
      )
      tiles([
        { label: 'Transactions', value: count(rows.length) },
        { label: 'Donated', value: ml(donated), caption: `${count(donors.length)} donor booking(s)` },
        { label: 'Dispensed', value: ml(dispensed), caption: `${count(recipients.length)} recipient booking(s)` },
      ])
      table(
        [
          { header: 'Completed', width: 0.14, value: (r) => shortDate(r.completed_at) },
          { header: 'Mother', width: 0.21, value: (r) => r.owner_name || '-' },
          { header: 'Email', width: 0.27, value: (r) => r.owner_email },
          { header: 'Type', width: 0.11, value: (r) => (r.request_type === 'DONOR' ? 'Donor' : 'Recipient') },
          { header: 'Appointment', width: 0.13, value: (r) => shortDate(r.preferred_date) },
          { header: 'Amount', width: 0.14, align: 'right', bold: true, value: (r) => ml(r.amount_ml) },
        ],
        rows,
        'No transactions were completed in this period.',
        rows.length ? ['', '', '', '', 'Net', ml(donated - dispensed)] : undefined
      )
      if (rows.length) {
        note(
          'Amount is what staff recorded when closing the booking: millilitres donated (Donor) or dispensed ' +
            '(Recipient). Net = donated minus dispensed in this period.'
        )
      }
    }

    // --- User Records ---------------------------------------------------------
    if (section === 'users') {
      // A to Z by name, numbers in natural order ("Santos 9" before "Santos 36");
      // accounts with no name yet go last, by email.
      const mothers = [...input.mothers].sort((a, b) => {
        if (!a.mom_name !== !b.mom_name) return a.mom_name ? -1 : 1
        return (a.mom_name || a.email).localeCompare(b.mom_name || b.email, 'en', {
          numeric: true,
          sensitivity: 'base',
        })
      })
      const donated = mothers.reduce((s, m) => s + (m.total_drawn_ml ?? 0), 0)
      const received = mothers.reduce((s, m) => s + (m.total_received_ml ?? 0), 0)

      sectionHeading('User Records', 'Registered mothers and their lifetime milk bank totals, A to Z.')
      tiles([
        { label: 'Registered mothers', value: count(mothers.length) },
        {
          label: 'Have donated',
          value: count(mothers.filter((m) => (m.total_drawn_ml ?? 0) > 0).length),
          caption: `${ml(donated)} in total`,
        },
        {
          label: 'Have received',
          value: count(mothers.filter((m) => (m.total_received_ml ?? 0) > 0).length),
          caption: `${ml(received)} in total`,
        },
      ])
      table(
        [
          { header: 'Name', width: 0.25, value: (m) => m.mom_name || '-' },
          { header: 'Email', width: 0.33, value: (m) => m.email },
          { header: 'Joined', width: 0.14, value: (m) => shortDate(m.date_joined) },
          { header: 'Donated', width: 0.14, align: 'right', value: (m) => ml(m.total_drawn_ml) },
          { header: 'Received', width: 0.14, align: 'right', value: (m) => ml(m.total_received_ml) },
        ],
        mothers,
        'No registered mothers.',
        mothers.length ? ['Total', '', '', ml(donated), ml(received)] : undefined
      )
      note(
        "Donated and Received are each mother's lifetime totals across every KalingApp facility, the same " +
          'figures shown on the User Records page. This list is a snapshot as of the date generated and is not ' +
          'limited to the report period.'
      )
    }
  })

  // --- Footer + confidentiality line on every page (last: needs page count) ---
  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    const footerLine = PAGE_HEIGHT - MARGIN - 5
    doc.setDrawColor(...rgb(RULE))
    doc.setLineWidth(0.2)
    doc.line(MARGIN, footerLine, MARGIN + CONTENT_WIDTH, footerLine)
    text(
      fit(`KalingApp - ${input.facilityName} - ${title} - Confidential: contains personal information`, CONTENT_WIDTH - 25, 7.5),
      MARGIN,
      footerLine + 4.5,
      { size: 7.5, color: MUTED }
    )
    text(`Page ${page} of ${pageCount}`, MARGIN + CONTENT_WIDTH, footerLine + 4.5, {
      size: 7.5,
      color: ACCENT,
      align: 'right',
      bold: true,
    })
  }

  return doc
}
