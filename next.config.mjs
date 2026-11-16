/**
 * Security headers for every page.
 *
 * - The dashboard may not be shown inside another site's frame (X-Frame-Options
 *   and frame-ancestors), so no page can overlay it and trick staff into
 *   clicking. base-uri / object-src / form-action close off the usual ways an
 *   injected tag could redirect the page, load a plugin or post a form elsewhere.
 * - No content-type guessing, no full URLs sent to other sites, no camera,
 *   microphone or location for this page, and HTTPS only.
 *
 * - Where the page may load from and talk to (Content-Security-Policy):
 *   scripts, styles and fonts only from this site; network requests only to
 *   this site and the KalingApp backend. A script someone manages to inject
 *   can't pull in more code from elsewhere, or send what it reads (bookings,
 *   health records) to a server of its own.
 *
 *   Inline scripts stay allowed ('unsafe-inline'): Next.js writes its own into
 *   every page, and only per-request nonces could tell those apart, which
 *   would turn every statically built page into one rendered on each visit.
 *   The login itself is out of page scripts' reach anyway (lib/session-server.ts).
 *   'unsafe-eval' only in `next dev`, which needs it for hot reload.
 */
const BACKEND_ORIGIN = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000').origin
const DEV = process.env.NODE_ENV !== 'production'

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${DEV ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  // Pictures may come from anywhere (article images are links an admin pastes);
  // blob: and data: for photos and charts made in the page.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${BACKEND_ORIGIN}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Type errors fail the build instead of shipping silently.
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
