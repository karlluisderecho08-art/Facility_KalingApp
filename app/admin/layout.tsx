'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { FacilitySidebar } from '@/components/facility-sidebar'
import { FacilityHeader } from '@/components/facility-header'

// Structured to match the admin dashboard's layout (KalingApp/app/admin/layout.tsx)
// exactly: a fixed, non-collapsible sidebar and a plain flex shell, rather than
// the shadcn SidebarProvider/SidebarTrigger pattern this used before -- that
// collapsible-sidebar primitive has its own default sizing and chrome (a
// trigger button, a sticky inner bar) that admin's sidebar doesn't have, which
// is what made the two look like different products side by side.
export default function FacilityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isInitializing } = useAuth()
  const router = useRouter()
  // The sidebar only fits beside the page from lg up. Below that it is a
  // drawer over the page, opened from the header and closed by the backdrop,
  // Escape, or following one of its links. Before, it stayed open on phones
  // and tablets and squeezed every page into a strip a few words wide.
  const [navOpen, setNavOpen] = useState(false)
  const closeNav = useCallback(() => setNavOpen(false), [])

  useEffect(() => {
    if (!navOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [navOpen])

  useEffect(() => {
    // Wait for the initial /auth/me/ check to finish before deciding to
    // redirect -- otherwise an already-logged-in user briefly bounces to
    // /login on every page refresh while that check is still in flight.
    if (!isInitializing && !isAuthenticated) {
      router.push('/login')
    }
  }, [isInitializing, isAuthenticated, router])

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="flex h-screen text-foreground">
      <FacilitySidebar open={navOpen} onClose={closeNav} />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <FacilityHeader onOpenNav={() => setNavOpen(true)} />
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
