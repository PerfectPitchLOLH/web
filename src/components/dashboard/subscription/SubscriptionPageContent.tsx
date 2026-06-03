'use client'

import { SubscriptionManagementView } from '@/components/dashboard/subscription/GestionAbonnement/SubscriptionManagementView'
import { PageSkeleton } from '@/components/dashboard/subscription/NewSubscriber/PageSkeleton'
import { PricingView } from '@/components/dashboard/subscription/NewSubscriber/PricingView'
import { usePlans } from '@/hooks/usePlans'
import { useSubscription } from '@/hooks/useSubscription'

export function SubscriptionPageContent() {
  const {
    subscription,
    loading,
    cancelSubscription,
    reactivateSubscription,
    upgradeSubscription,
    openPortal,
  } = useSubscription()
  const { plans, loading: plansLoading } = usePlans()

  if (loading || plansLoading) return <PageSkeleton />

  if (subscription?.hasActiveSubscription) {
    return (
      <div className="py-8 px-4 max-w-5xl mx-auto">
        <SubscriptionManagementView
          subscription={subscription}
          plans={plans}
          cancelSubscription={cancelSubscription}
          reactivateSubscription={reactivateSubscription}
          upgradeSubscription={upgradeSubscription}
          openPortal={openPortal}
        />
      </div>
    )
  }

  return <PricingView plans={plans} />
}
