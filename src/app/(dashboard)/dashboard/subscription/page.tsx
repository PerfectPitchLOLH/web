'use client'

import {
  Calendar,
  Check,
  Clock,
  Edit,
  Layers,
  Loader2,
  Music,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'

import { AdditionalCreditsSection } from '@/components/credits/AdditionalCreditsSection'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSubscription } from '@/hooks/useSubscription'
import { cn } from '@/lib/utils'

type BillingCycle = 'monthly' | 'yearly'

type PricingTier = {
  name: string
  price: {
    monthly: number
    yearly: number
  }
  description: string
  highlight?: string
  popular?: boolean
  features: {
    transcriptionMinutes: number
    fallingNotes: boolean
    historyDays: number | 'unlimited'
    sheetEditor: boolean
    polyphony: boolean
  }
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Junior',
    price: { monthly: 9.99, yearly: 99.99 },
    description: 'Parfait pour débuter avec la transcription musicale',
    features: {
      transcriptionMinutes: 10,
      fallingNotes: true,
      historyDays: 30,
      sheetEditor: false,
      polyphony: false,
    },
  },
  {
    name: 'Basic',
    price: { monthly: 14.99, yearly: 149.99 },
    description: 'Idéal pour les musiciens réguliers',
    highlight: 'Plus populaire',
    popular: true,
    features: {
      transcriptionMinutes: 20,
      fallingNotes: true,
      historyDays: 90,
      sheetEditor: false,
      polyphony: false,
    },
  },
  {
    name: 'Pro',
    price: { monthly: 29.99, yearly: 299.99 },
    description: 'La puissance complète pour les professionnels',
    highlight: 'Meilleure valeur',
    features: {
      transcriptionMinutes: 50,
      fallingNotes: true,
      historyDays: 'unlimited',
      sheetEditor: true,
      polyphony: true,
    },
  },
]

function PricingCard({
  tier,
  billingCycle,
  index,
  onSubscribe,
  loading,
}: {
  tier: PricingTier
  billingCycle: BillingCycle
  index: number
  onSubscribe: (tier: string, cycle: BillingCycle) => void
  loading: boolean
}) {
  const price = tier.price[billingCycle]

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-2xl border bg-card transition-all duration-300',
        tier.popular
          ? 'border-primary/50 shadow-lg shadow-primary/10 scale-105 z-10'
          : 'border-border hover:border-primary/30 hover:shadow-lg',
      )}
      style={{
        animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
      }}
    >
      {tier.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground px-4 py-1 shadow-lg">
            <Sparkles className="size-3 mr-1" />
            {tier.highlight}
          </Badge>
        </div>
      )}

      <div className="p-8">
        <div className="mb-6">
          <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
          <p className="text-sm text-muted-foreground">{tier.description}</p>
        </div>

        <div className="mb-8">
          {billingCycle === 'yearly' ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-muted-foreground line-through">
                  €{(tier.price.monthly * 12).toFixed(2)}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-5xl font-bold tracking-tight">
                  €{price.toFixed(2)}
                </span>
                <span className="text-muted-foreground">/an</span>
              </div>
            </>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold tracking-tight">
                €{price.toFixed(2)}
              </span>
              <span className="text-muted-foreground">/mois</span>
            </div>
          )}
        </div>

        <Button
          size="lg"
          variant={tier.popular ? 'default' : 'outline'}
          className="w-full mb-8 group-hover:scale-105 transition-transform"
          onClick={() => onSubscribe(tier.name.toLowerCase(), billingCycle)}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Chargement...
            </>
          ) : (
            `Commencer avec ${tier.name}`
          )}
        </Button>

        <div className="space-y-4">
          <FeatureItem
            icon={Clock}
            label="Transcription"
            value={`${tier.features.transcriptionMinutes} min/mois`}
          />
          <FeatureItem
            icon={Music}
            label="Touches qui tombent"
            value={tier.features.fallingNotes}
          />
          <FeatureItem
            icon={Calendar}
            label="Historique"
            value={
              tier.features.historyDays === 'unlimited'
                ? 'Illimité'
                : `${tier.features.historyDays} jours`
            }
          />
          <FeatureItem
            icon={Edit}
            label="Éditeur de partition"
            value={tier.features.sheetEditor}
          />
          <FeatureItem
            icon={Layers}
            label="Polyphonie"
            value={tier.features.polyphony}
          />
        </div>
      </div>

      {tier.popular && (
        <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
      )}
    </div>
  )
}

function FeatureItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | boolean | number
}) {
  const isBoolean = typeof value === 'boolean'
  const isEnabled = isBoolean ? value : true

  return (
    <div
      className={cn(
        'flex items-start gap-3 text-sm transition-opacity',
        !isEnabled && 'opacity-40',
      )}
    >
      <div
        className={cn(
          'rounded-lg p-2 mt-0.5',
          isEnabled
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {isBoolean && isEnabled ? (
          <Check className="size-4" />
        ) : isBoolean && !isEnabled ? (
          <div className="size-4 flex items-center justify-center">
            <div className="size-2 rounded-full bg-current opacity-30" />
          </div>
        ) : (
          <Icon className="size-4" />
        )}
      </div>
      <div className="flex-1">
        <p className="font-medium">{label}</p>
        {!isBoolean && <p className="text-muted-foreground mt-0.5">{value}</p>}
      </div>
    </div>
  )
}

function ComparisonTable() {
  return (
    <div className="mt-20 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Comparaison détaillée</h2>
        <p className="text-muted-foreground">
          Trouvez l&apos;offre qui correspond le mieux à vos besoins
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-4 pt-8 font-semibold">
                Fonctionnalité
              </th>
              <th className="text-center p-4 pt-8 font-semibold">Junior</th>
              <th className="text-center p-4 pt-8 font-semibold bg-primary/5 relative">
                <Badge
                  variant="outline"
                  className="absolute top-2 left-1/2 -translate-x-1/2 border-primary text-primary bg-background"
                >
                  Populaire
                </Badge>
                Basic
              </th>
              <th className="text-center p-4 pt-8 font-semibold">Pro</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                feature: 'Minutes de transcription',
                junior: '10 min/mois',
                basic: '20 min/mois',
                pro: '50 min/mois',
              },
              {
                feature: 'Touches qui tombent du ciel',
                junior: true,
                basic: true,
                pro: true,
              },
              {
                feature: 'Historique des partitions',
                junior: '30 jours',
                basic: '90 jours',
                pro: 'Illimité',
              },
              {
                feature: 'Éditeur de partition',
                junior: false,
                basic: false,
                pro: true,
              },
              {
                feature: 'Support polyphonie',
                junior: false,
                basic: false,
                pro: true,
              },
            ].map((row, i) => (
              <tr
                key={i}
                className="border-b border-border/50 hover:bg-muted/30 transition-colors"
              >
                <td className="p-4 font-medium">{row.feature}</td>
                <td className="text-center p-4">
                  <CellValue value={row.junior} />
                </td>
                <td className="text-center p-4 bg-primary/5">
                  <CellValue value={row.basic} highlight />
                </td>
                <td className="text-center p-4">
                  <CellValue value={row.pro} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CellValue({
  value,
  highlight,
}: {
  value: string | boolean
  highlight?: boolean
}) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check
        className={cn(
          'size-5 mx-auto',
          highlight ? 'text-primary' : 'text-foreground',
        )}
      />
    ) : (
      <div className="size-5 mx-auto flex items-center justify-center">
        <div className="size-2 rounded-full bg-muted-foreground/30" />
      </div>
    )
  }
  return (
    <span className={cn(highlight && 'font-semibold text-primary')}>
      {value}
    </span>
  )
}

export default function SubscriptionPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const { createCheckoutSession } = useSubscription()
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async (tierName: string, cycle: BillingCycle) => {
    setLoading(true)
    try {
      const priceIdMap: Record<string, Record<string, string>> = {
        junior: {
          monthly: process.env.NEXT_PUBLIC_STRIPE_JUNIOR_MONTHLY_PRICE_ID || '',
          yearly: process.env.NEXT_PUBLIC_STRIPE_JUNIOR_YEARLY_PRICE_ID || '',
        },
        basic: {
          monthly: process.env.NEXT_PUBLIC_STRIPE_BASIC_MONTHLY_PRICE_ID || '',
          yearly: process.env.NEXT_PUBLIC_STRIPE_BASIC_YEARLY_PRICE_ID || '',
        },
        pro: {
          monthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '',
          yearly: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID || '',
        },
      }

      const priceId = priceIdMap[tierName]?.[cycle]

      if (!priceId) {
        console.error('Price ID not found for:', tierName, cycle)
        return
      }

      await createCheckoutSession(priceId)
    } catch (error) {
      console.error('Subscription error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">
            Choisissez votre plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transcrivez votre musique en partitions avec une précision
            professionnelle. Tous les plans incluent les touches qui tombent.
          </p>

          <div className="flex justify-center mt-8">
            <Tabs
              value={billingCycle}
              onValueChange={(value) => setBillingCycle(value as BillingCycle)}
            >
              <TabsList className="grid w-fit grid-cols-2">
                <TabsTrigger value="monthly">Mensuel</TabsTrigger>
                <TabsTrigger value="yearly">Annuel</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 items-start">
          {pricingTiers.map((tier, index) => (
            <PricingCard
              key={tier.name}
              tier={tier}
              billingCycle={billingCycle}
              index={index}
              onSubscribe={handleSubscribe}
              loading={loading}
            />
          ))}
        </div>

        <ComparisonTable />

        <div id="credits">
          <AdditionalCreditsSection />
        </div>

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
