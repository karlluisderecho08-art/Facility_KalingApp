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
 * Scripts are deliberately not restricted here: Next.js injects inline scripts,
 * and a script policy would need per-request nonces to avoid breaking the app.
 */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
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
