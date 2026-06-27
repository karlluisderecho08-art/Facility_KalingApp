'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, User, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function FacilityHeader() {
  const router = useRouter()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Bell className="size-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
        <Badge className="absolute -top-2 -right-2 size-5 p-0 flex items-center justify-center bg-destructive text-xs">
          3
        </Badge>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="size-4 text-primary" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium">Maria Santos</p>
              <p className="text-xs text-muted-foreground">Facility Manager</p>
            </div>
            <ChevronDown className="size-4 text-muted-foreground" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">Maria Santos</p>
            <p className="text-xs text-muted-foreground">maria@kalingfacility.com</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profile Settings</DropdownMenuItem>
          <DropdownMenuItem>Facility Information</DropdownMenuItem>
          <DropdownMenuItem>Staff Management</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
