'use client'

import { ProcessQueue } from '@/components/process-queue'
import { RECIPIENT_STAGES } from '@/lib/booking'

// Recording an amount here SUBTRACTS from facility stock, and the backend
// refuses the request outright if the facility does not hold that much --
// see StaffConfirmCompletionView. That rejection surfaces as the dialog's
// error rather than being pre-empted here, so the number shown is always
// the server's, never a stale local copy.
export default function RecipientResultsPage() {
  return (
    <ProcessQueue
      requestType="RECIPIENT"
      stage={RECIPIENT_STAGES.results}
      title="Results — Amount Received"
      description="Record how many millilitres each mother actually received. This completes her booking and subtracts the milk from this facility's stock."
      action="complete"
      amountLabel="Millilitres dispensed (mL)"
      amountHelp="Whole millilitres. This amount is SUBTRACTED from the facility's milk stock, and cannot exceed what the facility currently holds."
    />
  )
}
