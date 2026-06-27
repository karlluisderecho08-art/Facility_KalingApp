'use client'

import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { FacilitySidebar } from '@/components/facility-sidebar'
import { FacilityHeader } from '@/components/facility-header'

export default function FacilityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <FacilitySidebar />
      <main className="w-full">
        <div className="border-b border-border sticky top-0 z-40 bg-background/95 backdrop-blur">
          <div className="flex items-center justify-between h-16 px-4 md:px-8">
            <SidebarTrigger className="-ml-1" />
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
