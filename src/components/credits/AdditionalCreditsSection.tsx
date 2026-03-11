'use client'

import { Sparkles } from 'lucide-react'
import { useState } from 'react'

import { CreditBundleCard } from './CreditBundleCard'
import { CreditPurchaseModal } from './CreditPurchaseModal'

const CREDIT_BUNDLES = [
  {
    id: 'small' as const,
    name: 'Petit',
    minutes: 5,
    price: 4.99,
    pricePerMinute: 0.998,
    priceId: process.env.NEXT_PUBLIC_STRIPE_CREDITS_SMALL_PRICE_ID || '',
  },
  {
    id: 'medium' as const,
    name: 'Moyen',
    minutes: 15,
    price: 12.99,
    pricePerMinute: 0.866,
    discountPercent: 13,
    priceId: process.env.NEXT_PUBLIC_STRIPE_CREDITS_MEDIUM_PRICE_ID || '',
  },
  {
    id: 'big' as const,
    name: 'Grand',
    minutes: 30,
    price: 22.99,
    pricePerMinute: 0.766,
    discountPercent: 23,
    bestValue: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_CREDITS_BIG_PRICE_ID || '',
  },
]

export function AdditionalCreditsSection({
  showHeader = true,
}: {
  showHeader?: boolean
}) {
  const [selectedBundle, setSelectedBundle] = useState<
    (typeof CREDIT_BUNDLES)[number] | null
  >(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handlePurchase = (bundleId: string) => {
    const bundle = CREDIT_BUNDLES.find((b) => b.id === bundleId)
    if (bundle) {
      setSelectedBundle(bundle)
      setIsModalOpen(true)
    }
  }

  const handlePurchaseComplete = () => {
    window.location.reload()
  }

  return (
    <section className={showHeader ? 'mt-24' : ''}>
      {showHeader && (
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 mb-4">
            <Sparkles className="size-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Flexibilité maximale
            </span>
          </div>

          <h2 className="text-4xl font-bold tracking-tight mb-4">
            Besoin de minutes supplémentaires ?
          </h2>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Achetez des{' '}
            <strong className="text-foreground">Crédits Bonus</strong>{' '}
            persistants sans changer d'abonnement.
            <br />
            Parfait pour les mois où vous transcrivez plus que d'habitude.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {CREDIT_BUNDLES.map((bundle, index) => (
          <CreditBundleCard
            key={bundle.id}
            bundle={bundle}
            onPurchase={handlePurchase}
            index={index}
          />
        ))}
      </div>

      <div className="mt-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-lg bg-green-500/10 px-6 py-4 backdrop-blur-sm border border-green-500/20">
          <Sparkles className="size-5 text-green-500" />
          <p className="text-sm font-medium">
            Les <strong>Crédits Bonus</strong> n'expirent jamais et ne sont pas
            écrasés lors du renouvellement mensuel
          </p>
        </div>
      </div>

      <CreditPurchaseModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        bundle={selectedBundle}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </section>
  )
}
