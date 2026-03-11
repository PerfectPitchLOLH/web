'use client'

import { SubscriptionManagementView } from '@/components/dashboard/subscription/GestionAbonnement/SubscriptionManagementView'
import { PageSkeleton } from '@/components/dashboard/subscription/NewSubscriber/PageSkeleton'
import { PricingView } from '@/components/dashboard/subscription/NewSubscriber/PricingView'
import { useSubscription } from '@/hooks/useSubscription'

export default function SubscriptionPage() {
  const { subscription, loading } = useSubscription()

  if (loading) return <PageSkeleton />

  if (subscription?.hasActiveSubscription) {
    return (
      <div className="py-8 px-4 max-w-5xl mx-auto">
        <SubscriptionManagementView />
      </div>
    )
  }

  return <PricingView />
}
