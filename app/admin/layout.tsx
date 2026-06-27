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
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) return null

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
