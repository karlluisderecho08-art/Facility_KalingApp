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
  LayoutDashboard,
  Users,
  FileText,
  Building2,
  MessageSquare,
  Activity,
  Settings,
  BarChart3,
  Heart,
} from 'lucide-react'

export function AdminSidebar() {
  const pathname = usePathname()

  const menuItems = [
    {
      group: 'Main',
      items: [
        { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
      ],
    },
    {
      group: 'Management',
      items: [
        { href: '/admin/users', icon: Users, label: 'User Management' },
        { href: '/admin/articles', icon: FileText, label: 'Article Review' },
        { href: '/admin/facilities', icon: Building2, label: 'Facilities' },
        { href: '/admin/community', icon: MessageSquare, label: 'Community' },
      ],
    },
    {
      group: 'System',
      items: [
        { href: '/admin/health', icon: Activity, label: 'System Health' },
        { href: '/admin/chatbot', icon: Heart, label: 'Chatbot Config' },
        { href: '/admin/settings', icon: Settings, label: 'Settings' },
      ],
    },
  ]

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname.startsWith(href)
  }

  return (
    <Sidebar className="border-r border-border">
      <SidebarContent>
        {/* Logo/Brand */}
        <div className="px-6 py-4 border-b border-sidebar-border">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" fill="white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm">KalingApp</span>
              <span className="text-xs text-sidebar-foreground/60">Admin Panel</span>
            </div>
          </Link>
        </div>

        {/* Menu Groups */}
        {menuItems.map((group, idx) => (
          <SidebarGroup key={idx} className="px-0">
            <SidebarGroupLabel className="px-6">{group.group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton render={<Link href={item.href} />} isActive={active} className="mx-2">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
