'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { FacilitySidebar } from '@/components/facility-sidebar'
import { FacilityHeader } from '@/components/facility-header'

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

  if (isInitializing || !isAuthenticated) return null

  return (
    <SidebarProvider defaultOpen={true}>
      <FacilitySidebar />
      <main className="w-full">
        <div className="border-b border-border sticky top-0 z-40 bg-white">
          <div className="flex items-center justify-between px-8 py-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">Facility Management</h1>
                <p className="text-xs text-muted-foreground">Welcome back, admin</p>
              </div>
            </div>
            <FacilityHeader />
          </div>
        </div>
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
