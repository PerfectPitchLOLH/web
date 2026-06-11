import { Suspense } from 'react'

import { ActivationChecklist } from '@/components/dashboard/ActivationChecklist'
import { CreditBalanceCard } from '@/components/dashboard/credits/CreditBalanceCard'
import { DashboardWelcome } from '@/components/dashboard/DashboardWelcome'
import { ResumeCard } from '@/components/dashboard/ResumeCard'
import { SubscriptionSuccessCelebration } from '@/components/dashboard/SubscriptionSuccessCelebration'

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <Suspense fallback={null}>
        <SubscriptionSuccessCelebration />
      </Suspense>
      <ActivationChecklist />
      <ResumeCard />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardWelcome />
        <CreditBalanceCard />
      </div>
    </div>
  )
}
