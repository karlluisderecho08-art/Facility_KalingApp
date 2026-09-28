'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { AppNotification, formatNotificationDate } from '@/lib/notifications'

// Same hand-rolled dropdown shape as the user-menu button right next to it
// (see FacilityHeader's own comment on why: shadcn's DropdownMenu default
// sizing read at a different scale than the rest of this header). Sitting
// beside that dropdown rather than replacing it -- staff still need to log
// out, this is a second, independent thing to open.
export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  const loadNotifications = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const res = await apiFetch('/notifications/mine/')
      if (!res.ok) throw new Error(`Failed to load notifications (${res.status})`)
      setNotifications(await res.json())
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setIsLoading(false)
      setHasLoadedOnce(true)
    }
  }, [])

  // Loaded on mount so the unread badge is right the moment the header
  // renders, not only after the bell is first opened.
  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const toggleDropdown = () => {
    const opening = !showDropdown
    setShowDropdown(opening)
    // Re-fetch on open rather than trusting the mount-time snapshot -- staff
    // may have had this tab open for a while, and this is the moment she's
    // actually about to read the list.
    if (opening) loadNotifications()
  }

  const markRead = async (notification: AppNotification) => {
    if (notification.is_read) return
    // Optimistic: the badge count should drop the instant she clicks, not
    // after a round trip. Reverted below if the request actually fails.
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
    )
    try {
      const res = await apiFetch(`/notifications/${notification.id}/read/`, { method: 'POST' })
      if (!res.ok) throw new Error()
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: false } : n))
      )
    }
  }

  const markAllRead = async () => {
    if (unreadCount === 0) return
    const previous = notifications
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    try {
      const res = await apiFetch('/notifications/read-all/', { method: 'POST' })
      if (!res.ok) throw new Error()
    } catch {
      setNotifications(previous)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="relative flex items-center justify-center h-11 w-11 rounded-xl bg-light-pink hover:bg-light-pink/80 text-primary transition-all duration-200"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-border py-2 z-50">
          <div className="px-4 py-2 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-primary hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading && !hasLoadedOnce ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : loadError ? (
              <p className="px-4 py-6 text-sm text-destructive text-center">{loadError}</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                No notifications yet.
              </p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => markRead(notification)}
                  className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 transition-colors ${
                    notification.is_read ? 'hover:bg-muted/50' : 'bg-light-pink/30 hover:bg-light-pink/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!notification.is_read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                    <div className={notification.is_read ? 'pl-4' : ''}>
                      <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{notification.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatNotificationDate(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
