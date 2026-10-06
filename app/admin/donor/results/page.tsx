'use client'

import { ProcessQueue } from '@/components/process-queue'
import { DECLINE_REASONS, DONOR_STAGES } from '@/lib/booking'

// The only place a donation is ever added to facility stock. Recording an
// amount here closes the booking out -- there is no undo, because the
// millilitres are applied to Facility.stock_level_ml at the same moment.
export default function DonorResultsPage() {
  return (
    <ProcessQueue
      requestType="DONOR"
      stage={DONOR_STAGES.results}
      title="Results — Amount Donated"
      description="Record how many millilitres each mother actually donated. This completes her booking and adds the milk to this facility's stock."
      declineReasons={DECLINE_REASONS.donorResults}
      action="complete"
      amountLabel="Millilitres donated (mL)"
      amountHelp="Whole millilitres. This amount is ADDED to the facility's milk stock and credited to the mother's lifetime total."
    />
  )
}
