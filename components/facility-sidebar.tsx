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
  Users,
} from 'lucide-react'

const mainNavItems = [
  { icon: BarChart3, label: 'Dashboard', href: '/admin' },
  { icon: Calendar, label: 'Booking Requests', href: '/admin/bookings' },
  { icon: Users, label: 'User Management', href: '/admin/users' },
]

const systemNavItems = [
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
]

export function FacilitySidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <Sidebar className="bg-white border-r border-border">
      <SidebarContent>
        <SidebarGroup>
          <div className="p-5 border-b border-border">
            <div className="flex items-center gap-3">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/kalingapp-logo-kZ5dYwW0EczGiFN8WRQf0BUCupImzB.png"
                alt="KalingApp"
                width={40}
                height={40}
                className="object-contain"
              />
              <div>
                <h1 className="text-lg font-bold text-foreground leading-tight">KalingApp</h1>
                <p className="text-xs text-muted-foreground">Facility Manager</p>
              </div>
            </div>
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
                    className={
                      isActive(item.href)
                        ? 'bg-light-pink text-primary font-semibold px-4 py-2.5 rounded-xl'
                        : 'text-muted-foreground px-4 py-2.5 rounded-xl'
                    }
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
                    className={
                      isActive(item.href)
                        ? 'bg-light-pink text-primary font-semibold px-4 py-2.5 rounded-xl'
                        : 'text-muted-foreground px-4 py-2.5 rounded-xl'
                    }
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
