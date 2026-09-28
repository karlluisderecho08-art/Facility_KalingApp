'use client'

import { ProcessQueue } from '@/components/process-queue'
import { RECIPIENT_STAGES } from '@/lib/booking'

// First stop after a recipient's booking is approved. She is NOT waiting on
// anything here -- staff are, which is why she sits as "Scheduled" rather
// than "Awaiting Attendance" (that status would start an 8-business-hour
// clock against a mother with nothing left to do). Approving moves her to
// Booking Confirmation, which IS the wait on her.
export default function RecipientStatusPage() {
  return (
    <ProcessQueue
      requestType="RECIPIENT"
      stage={RECIPIENT_STAGES.status}
      title="Status — Document Review"
      description="Recipients whose submitted requirements need checking. Approve to ask each mother to confirm her attendance."
      action="advance"
      advanceLabel="Approve & ask her to confirm attendance"
    />
  )
}
