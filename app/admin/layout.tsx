'use client'

import { useEffect } from 'react'
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="flex h-screen bg-background text-foreground">
      <FacilitySidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <FacilityHeader />
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
