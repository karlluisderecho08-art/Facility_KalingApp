'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  Calendar,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react'

const mainNavItems = [
  { icon: BarChart3, label: 'Dashboard', href: '/admin' },
  { icon: Calendar, label: 'Booking Requests', href: '/admin/bookings' },
]

const systemNavItems = [
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
  { icon: LogOut, label: 'Logout', href: '/logout', external: true },
]

export function FacilitySidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <div className="px-4 py-3 mb-2">
            <div className="flex items-center gap-3 mb-1">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/kalingapp-logo-kZ5dYwW0EczGiFN8WRQf0BUCupImzB.png"
                alt="KalingApp"
                width={32}
                height={32}
                className="object-contain"
              />
              <h1 className="text-lg font-bold text-foreground">KalingApp</h1>
            </div>
            <p className="text-xs text-muted-foreground">Facility Manager</p>
          </div>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={isActive(item.href)}
                    className={isActive(item.href) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={isActive(item.href)}
                    className={isActive(item.href) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
