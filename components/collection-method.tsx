'use client'

// How a donor's milk reaches the facility (Pick up / Walk-in / Drop off),
// shown on the process-queue cards and in View Details. For a Drop off it
// also shows the courier booking link she pasted, opened in a new tab.

import { ExternalLink, Truck } from 'lucide-react'
import {
  COLLECTION_METHOD_HINTS,
  COLLECTION_METHOD_LABELS,
  type MilkBankRequest,
} from '@/lib/booking'

/** Only http(s) links are made clickable -- the backend accepts no others, but never trust a link blindly. */
function safeHref(link: string): string | null {
  try {
    const url = new URL(link)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

export function CollectionMethodInfo({
  request,
}: {
  request: Pick<MilkBankRequest, 'request_type' | 'collection_method' | 'delivery_link'>
}) {
  if (request.request_type !== 'DONOR') return null
  const method = request.collection_method || ''
  const href = request.delivery_link ? safeHref(request.delivery_link) : null

  return (
    <div className="rounded-lg border border-border p-3 space-y-1">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Truck className="h-3.5 w-3.5" />
        Breastmilk collection
      </p>
      {method ? (
        <>
          <p className="text-sm font-medium">{COLLECTION_METHOD_LABELS[method]}</p>
          <p className="text-xs text-muted-foreground">{COLLECTION_METHOD_HINTS[method]}</p>
          {method === 'drop_off' &&
            (href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline break-all"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                Open delivery booking link
              </a>
            ) : (
              // Expected until her appointment hour: she books the courier and
              // pastes its link then (the app asks for it from that hour on).
              <p className="text-xs text-muted-foreground">
                No delivery link yet. The mother pastes it at her appointment hour, when she books the courier.
              </p>
            ))}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Not specified (booked from an older app version)</p>
      )}
    </div>
  )
}
