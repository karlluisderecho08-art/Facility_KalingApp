'use client'

import { ProcessQueue } from '@/components/process-queue'
import { DECLINE_REASONS, RECIPIENT_STAGES } from '@/lib/booking'

// First stop after a recipient's booking is approved. She is NOT waiting on
// anything here -- staff are, which is why she sits as "Scheduled" rather
// than "Awaiting Attendance" (that status would start an 8-business-hour
// clock against a mother with nothing left to do). Approving moves her to
// the backend's "Booking Confirmation" stage, which IS the wait on her --
// see lib/booking.ts's RECIPIENT_STAGES and facility-sidebar.tsx's comment
// on why this page is labeled "Booking Confirmation" in the sidebar even
// though it still filters on the "Status" stage: this is the actionable
// step staff take to GET her to that stage, and there is deliberately no
// separate page for the read-only wait once she's there.
export default function RecipientStatusPage() {
  return (
    <ProcessQueue
      requestType="RECIPIENT"
      stage={RECIPIENT_STAGES.status}
      title="Booking Confirmation — Document Review"
      description="Recipients whose submitted requirements need checking. Approve to ask each mother to confirm her attendance."
      declineReasons={DECLINE_REASONS.recipientReview}
      action="advance"
      advanceLabel="Approve & ask her to confirm attendance"
    />
  )
}
