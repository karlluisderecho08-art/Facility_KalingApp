'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { LogOut, User } from 'lucide-react'

// Mirrors the admin dashboard's Header (KalingApp/components/admin/header.tsx)
// exactly: same header bar, same title/subtitle placement, same hand-rolled
// dropdown (rather than the shadcn DropdownMenu primitive, whose own default
// sizing is what made this look and read at a different scale from admin).
export function FacilityHeader() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [showDropdown, setShowDropdown] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <header className="bg-white border-b border-border px-8 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Facility Management</h2>
        <p className="text-sm text-muted-foreground">Welcome back, {user?.username || 'Facility Mgmt.'}</p>
      </div>

      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-3 px-4 py-2 rounded-xl bg-light-pink hover:bg-light-pink/80 text-primary transition-all duration-200"
        >
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
          <span className="text-sm font-medium text-foreground">{user?.username || 'Facility Mgmt.'}</span>
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-border py-2 z-50">
            <div className="px-4 py-2 border-b border-border">
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2 transition"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
