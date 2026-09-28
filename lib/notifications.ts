// lib/notifications.ts
//
// The shape returned by GET /notifications/mine/ (notifications.serializers.
// NotificationItemSerializer) and the small helpers the bell in the header
// needs. A facility account gets these the same way a mother does -- see
// notifications.views.MyNotificationsView, which scopes to request.user with
// no role check -- the only thing new here is that milkbank/views.py and
// articles/views.py now actually write rows for a facility_staff owner
// (a new booking landing at their facility, a mother confirming attendance),
// where previously nothing ever did.

export interface AppNotification {
  id: number
  title: string
  description: string
  category: 'Reminders' | 'Articles' | 'Bookings'
  created_at: string
  is_read: boolean
}

export function formatNotificationDate(createdAt: string): string {
  return new Date(createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
