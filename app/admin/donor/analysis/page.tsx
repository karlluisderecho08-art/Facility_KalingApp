'use client'

import { ProcessQueue } from '@/components/process-queue'
import { DONOR_STAGES } from '@/lib/booking'

export default function DonorAnalysisPage() {
  return (
    <ProcessQueue
      requestType="DONOR"
      stage={DONOR_STAGES.breastmilkAnalysis}
      title="Breastmilk Analysis"
      description="Donors whose milk is being analysed. Approve to move each mother on to Results, where the amount donated is recorded."
      action="advance"
      advanceLabel="Approve & move to Results"
    />
  )
}
