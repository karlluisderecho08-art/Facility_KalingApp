'use client'

// How a donor's milk reaches the facility (Pick up / Walk-in / Drop off),
// shown on the process-queue cards and in View Details. For a Drop off it
// also shows the courier booking link she pasted, opened in a new tab.

import { ExternalLink, MapPin, Truck } from 'lucide-react'
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

/** A Google Maps link to her pin (the Maps URLs API: no key, opens the app on a phone). */
function pinHref(lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`
}

export function CollectionMethodInfo({
  request,
}: {
  request: Pick<
    MilkBankRequest,
    | 'request_type' | 'collection_method' | 'delivery_link'
    | 'pickup_address' | 'pickup_landmark' | 'pickup_latitude' | 'pickup_longitude'
  >
}) {
  if (request.request_type !== 'DONOR') return null
  const method = request.collection_method || ''
  const href = request.delivery_link ? safeHref(request.delivery_link) : null
  const pin = pinHref(request.pickup_latitude, request.pickup_longitude)
  const hasPickupPlace = Boolean(request.pickup_address || pin)

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
          {method === 'pickup' &&
            (hasPickupPlace ? (
              <div className="pt-1 space-y-1">
                {request.pickup_address && (
                  <p className="text-sm flex items-start gap-1.5 break-words">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                    <span>{request.pickup_address}</span>
                  </p>
                )}
                {request.pickup_landmark && (
                  <p className="text-xs text-muted-foreground break-words">Landmark: {request.pickup_landmark}</p>
                )}
                {pin && (
                  <a
                    href={pin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    Open pin in Google Maps
                  </a>
                )}
              </div>
            ) : (
              // Booked from an app version that didn't ask yet, or cleared a
              // week after the booking closed.
              <p className="text-xs text-muted-foreground">
                No pickup address on file. Ask the mother for it in Chat.
              </p>
            ))}
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
