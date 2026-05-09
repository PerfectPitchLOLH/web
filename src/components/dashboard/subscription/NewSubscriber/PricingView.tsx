'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useSubscription } from '@/hooks/useSubscription'
import type { SubscriptionPlanDTO } from '@/server/domains/subscription/subscription.types'

import { PricingTiersSection } from '../PricingTiersSection'
import { ComparisonTable } from './ComparisonTable'

type Props = {
  plans: SubscriptionPlanDTO[]
}

export function PricingView({ plans }: Props) {
  const { createCheckoutSession } = useSubscription()
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async (priceId: string) => {
    if (!priceId) return
    setLoading(true)
    try {
      await createCheckoutSession(priceId)
    } catch (error) {
      console.error('Subscription error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">
            Choisissez votre plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transcrivez votre musique en partitions avec une précision
            professionnelle. Tous les plans incluent les touches qui tombent.
          </p>
        </div>

        <div className="mb-16">
          <PricingTiersSection
            mode="subscribe"
            plans={plans}
            onAction={handleSubscribe}
            loading={loading}
          />
        </div>

        <ComparisonTable />

        <div className="mt-20 text-center">
          <div className="inline-block p-8 rounded-2xl border border-border bg-card/50 backdrop-blur">
            <h3 className="text-2xl font-bold mb-4">
              Vous avez des questions ?
            </h3>
            <p className="text-muted-foreground mb-6">
              Notre équipe est là pour vous aider à choisir le plan qui vous
              convient
            </p>
            <Button variant="outline" size="lg">
              Contactez-nous
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
