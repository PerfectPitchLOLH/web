import { Suspense } from 'react'

import { CreditBalanceCard } from '@/components/dashboard/credits/CreditBalanceCard'
import { SubscriptionSuccessCelebration } from '@/components/dashboard/SubscriptionSuccessCelebration'
import { auth } from '@/server/lib/auth'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bonjour'
  if (hour < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

export default async function DashboardPage() {
  const session = await auth()
  const greeting = getGreeting()
  const name = session?.user?.name

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <Suspense fallback={null}>
        <SubscriptionSuccessCelebration />
      </Suspense>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CreditBalanceCard />

        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold">
            {name ? `${greeting}, ${name} !` : `${greeting} !`}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Votre espace de travail pour la séparation de stems et la production
            musicale
          </p>
        </div>
      </div>
    </div>
  )
}
