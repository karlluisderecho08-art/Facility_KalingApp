'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Calendar,
  Droplets,
  HeartHandshake,
  Receipt,
  Settings,
  Users,
} from 'lucide-react'

// The sidebar mirrors how a booking actually moves through the facility,
// which is why it is two-level rather than the flat list it used to be.
//
// Booking Request is the one place a request is ever refused. Everything
// under Donor Process and Recipient Process is post-approval work, so none
// of those screens offer a decline -- see ProcessQueue for why.
//
// The two pathways have genuinely different shapes and are NOT symmetric:
//
//   Donor      Booking Request -> (she confirms attendance in the app)
//              -> Counseling and Testing -> Breastmilk Analysis -> Results
//
//   Recipient  Booking Request -> Status (staff review) -> Booking
//              Confirmation (she confirms) -> Results
//
// A donor has no "Booking Confirmation" entry here on purpose: between
// approval and Counseling and Testing she is waiting on nobody but herself,
// so she stays in Booking Request > Confirmed until she confirms attendance,
// at which point she appears under Counseling and Testing.
interface NavLeaf {
  label: string
  href: string
}

interface NavSection {
  label: string
  icon: typeof BarChart3
  href?: string
  children?: NavLeaf[]
}

const navItems: NavSection[] = [
  { label: 'Dashboard', href: '/admin', icon: BarChart3 },
  { label: 'Booking Request', href: '/admin/bookings', icon: Calendar },
  {
    label: 'Donor Process',
    icon: Droplets,
    children: [
      { label: 'Counseling and Testing', href: '/admin/donor/counseling' },
      { label: 'Breastmilk Analysis', href: '/admin/donor/analysis' },
      { label: 'Results', href: '/admin/donor/results' },
    ],
  },
  {
    label: 'Recipient Process',
    icon: HeartHandshake,
    children: [
      { label: 'Status', href: '/admin/recipient/status' },
      { label: 'Booking Confirmation', href: '/admin/recipient/confirmation' },
      { label: 'Results', href: '/admin/recipient/results' },
    ],
  },
  // Where a booking goes once it leaves both process queues for good. A
  // completed request's current_stage_index stays parked on "Results"
  // forever (nothing moves it further), so lib/booking.ts's isOnStage()
  // excludes 'completed' from every queue above and isFinished() is what
  // routes it here instead -- otherwise it would sit in Results showing a
  // "Record amount & complete" button with nothing left to record.
  { label: 'Finished Transactions', href: '/admin/transactions', icon: Receipt },
  { label: 'User Management', href: '/admin/users', icon: Users },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

export function FacilitySidebar() {
  const pathname = usePathname()

  // '/admin' is an exact match -- as a prefix it would light up for every
  // page in the dashboard, since they all live under it.
  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className="w-64 bg-white border-r border-border overflow-y-auto">
      {/* Logo Section -- h-20, matching admin's sidebar exactly (see that
          file's comment): a fixed height here, not content-driven padding,
          so this box lands at the same height as the header bar's own h-20
          and their bottom borders form one continuous line instead of a
          visible step at the sidebar/header boundary. */}
      <div className="h-20 px-5 border-b border-border flex items-center">
        <div className="flex items-center gap-3">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/kalingapp-logo-kZ5dYwW0EczGiFN8WRQf0BUCupImzB.png"
            alt="KalingApp"
            width={44}
            height={44}
            className="object-contain"
          />
          <div>
            <h1 className="font-bold text-foreground leading-tight">KalingApp</h1>
            <p className="text-xs text-muted-foreground">Facility Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon

          if (item.href) {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-light-pink text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-light-pink/50 hover:text-primary'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          }

          // A section header, not a link: there is no combined "all donor
          // work" screen to point it at, and making it navigable would
          // promise a page that does not exist.
          const sectionActive = item.children?.some((child) => isActive(child.href))
          return (
            <div key={item.label} className="pt-2">
              <div
                className={`flex items-center gap-3 px-4 py-2 ${
                  sectionActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-semibold text-sm">{item.label}</span>
              </div>
              <div className="ml-4 pl-4 border-l border-border space-y-1 mt-1">
                {item.children?.map((child) => {
                  const active = isActive(child.href)
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`block px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                        active
                          ? 'bg-light-pink text-primary font-semibold'
                          : 'text-muted-foreground hover:bg-light-pink/50 hover:text-primary'
                      }`}
                    >
                      {child.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
