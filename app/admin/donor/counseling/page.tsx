'use client'

import { ProcessQueue } from '@/components/process-queue'
import { DECLINE_REASONS, DONOR_STAGES } from '@/lib/booking'

// A donor reaches this queue on her own: accepting her booking puts her on
// "Booking Confirmation", and confirming her attendance in the mobile app
// advances her here. So nothing appears until she has actually said she is
// coming -- which is the point, since this stage is done face to face.
export default function DonorCounselingPage() {
  return (
    <ProcessQueue
      requestType="DONOR"
      stage={DONOR_STAGES.counselingAndTesting}
      title="Counseling and Testing"
      description="Donors who have confirmed attendance and are in counseling, physical, and blood testing. Approve to move each mother on to Breastmilk Analysis."
      declineReasons={DECLINE_REASONS.donorCounseling}
      action="advance"
      advanceLabel="Approve & move to Breastmilk Analysis"
    />
  )
}
