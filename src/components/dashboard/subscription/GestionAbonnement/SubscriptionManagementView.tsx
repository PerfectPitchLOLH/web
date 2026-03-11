'use client'

import { useEffect, useState } from 'react'

import { AdditionalCreditsSection } from '@/components/credits/AdditionalCreditsSection'
import { useSubscription } from '@/hooks/useSubscription'

import { PricingTiersSection } from '../PricingTiersSection'
import { getBillingInterval } from '../utils'
import { BillingCard } from './BillingCard'
import { CreditsCard } from './CreditsCard'
import { CurrentPlanCard } from './CurrentPlanCard'
import { DangerZone } from './DangerZone'
import { InvoicesSection } from './InvoicesSection'
import { ManagementSkeleton } from './Skeleton'
import { StatusBadge } from './StatusBadge'

export function SubscriptionManagementView() {
  const {
    subscription,
    loading,
    cancelSubscription,
    reactivateSubscription,
    upgradeSubscription,
    openPortal,
  } = useSubscription()
  const [actionLoading, setActionLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [upgradeLoading, setUpgradeLoading] = useState(false)

  useEffect(() => {
    if (!loading && window.location.hash) {
      const el = document.querySelector(window.location.hash)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }, [loading])

  if (loading) return <ManagementSkeleton />

  const sub = subscription?.subscription

  if (!sub) return null

  const isYearly =
    getBillingInterval(sub.currentPeriodStart, sub.currentPeriodEnd) ===
    'yearly'

  const handleCancel = async () => {
    setActionLoading(true)
    try {
      await cancelSubscription()
    } finally {
      setActionLoading(false)
    }
  }

  const handleReactivate = async () => {
    setActionLoading(true)
    try {
      await reactivateSubscription()
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpgrade = async (priceId: string) => {
    setUpgradeLoading(true)
    try {
      await upgradeSubscription(priceId)
    } finally {
      setUpgradeLoading(false)
    }
  }

  const handlePortal = async () => {
    setPortalLoading(true)
    try {
      await openPortal()
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex sm:flex-row sm:items-center justify-start gap-4">
        <h1 className="text-2xl font-bold tracking-tight">
          Gestion de l'abonnement
        </h1>
        <StatusBadge
          status={sub.status}
          cancelAtPeriodEnd={sub.cancelAtPeriodEnd}
          periodEnd={sub.currentPeriodEnd}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <CurrentPlanCard subscription={sub} />
        <BillingCard
          subscription={sub}
          onManage={handlePortal}
          loadingPortal={portalLoading}
        />
        <CreditsCard />
      </div>

      <div id="plan" className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Changer de plan</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Comparez les offres et passez à un niveau supérieur.
          </p>
        </div>
        <PricingTiersSection
          mode="manage"
          currentPlan={sub.plan.name}
          isYearly={isYearly}
          onAction={handleUpgrade}
          loading={upgradeLoading}
        />
      </div>

      <div id="credits" className="[&>section]:mt-0">
        <AdditionalCreditsSection />
      </div>

      <InvoicesSection invoices={subscription?.invoices ?? []} />

      <DangerZone
        subscription={sub}
        onCancel={handleCancel}
        onReactivate={handleReactivate}
        loading={actionLoading}
      />
    </div>
  )
}
