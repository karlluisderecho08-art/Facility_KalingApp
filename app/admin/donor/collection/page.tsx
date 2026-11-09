'use client'

import { ProcessQueue } from '@/components/process-queue'
import { DECLINE_REASONS, DONOR_STAGES } from '@/lib/booking'

export default function DonorCollectionPage() {
  return (
    <ProcessQueue
      requestType="DONOR"
      stage={DONOR_STAGES.breastmilkCollection}
      title="Breastmilk Collection"
      description="Donors whose milk is being collected. Approve to move each mother on to Results, where the amount donated is recorded."
      declineReasons={DECLINE_REASONS.donorCollection}
      action="advance"
      advanceLabel="Approve & move to Results"
    />
  )
}
