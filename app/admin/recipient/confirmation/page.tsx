'use client'

import { ProcessQueue } from '@/components/process-queue'
import { RECIPIENT_STAGES } from '@/lib/booking'

// Deliberately has no button. The mother confirms attendance from the mobile
// app; the facility's only job here is to see who it is waiting on. She
// advances herself to Results the moment she confirms.
export default function RecipientConfirmationPage() {
  return (
    <ProcessQueue
      requestType="RECIPIENT"
      stage={RECIPIENT_STAGES.bookingConfirmation}
      title="Booking Confirmation"
      description="Recipients who have been approved and asked to confirm their attendance. They move to Results on their own once they confirm in the app."
      action="wait"
      waitingNote="Waiting for this mother to confirm her attendance in the app. She moves to Results on her own once she does."
    />
  )
}
