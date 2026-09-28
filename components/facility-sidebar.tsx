'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar,
  BarChart3,
  Settings,
  Users,
} from 'lucide-react'

// Flat list, matching the admin dashboard's sidebar (KalingApp/components/admin/sidebar.tsx)
// exactly -- no "Main"/"System" grouping, same item shape.
const navItems = [
  { label: 'Dashboard', href: '/admin', icon: BarChart3 },
  { label: 'Booking Requests', href: '/admin/bookings', icon: Calendar },
  { label: 'User Management', href: '/admin/users', icon: Users },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

export function FacilitySidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className="w-64 bg-white border-r border-border overflow-y-auto">
      {/* Logo Section -- same box, spacing and type scale as the admin dashboard's sidebar */}
      <div className="p-5 border-b border-border">
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
        })}
      </nav>
    </aside>
  )
}
