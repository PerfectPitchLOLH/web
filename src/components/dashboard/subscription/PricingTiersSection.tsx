'use client'

import {
  ArrowUp,
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

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { SubscriptionPlanDTO } from '@/server/domains/subscription/subscription.types'

import { TIER_ORDER, TIER_UI_METADATA } from './constants'
import { formatAmount } from './utils'

type BillingCycle = 'monthly' | 'yearly'

type SubscribeMode = {
  mode: 'subscribe'
  onAction: (priceId: string) => void
  loading: boolean
}

type ManageMode = {
  mode: 'manage'
  currentPlan: string
  isYearly: boolean
  onAction: (priceId: string) => void
  loading: boolean
}

type Props = (SubscribeMode | ManageMode) & {
  plans: SubscriptionPlanDTO[]
}

type TierStatus = 'subscribe' | 'current' | 'upgrade' | 'downgrade'

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

function PricingCard({
  plan,
  billingCycle,
  index,
  tierStatus,
  onAction,
  loading,
}: {
  plan: SubscriptionPlanDTO
  billingCycle: BillingCycle
  index: number
  tierStatus: TierStatus
  onAction: (priceId: string) => void
  loading: boolean
}) {
  const tierKey = plan.name.toLowerCase()
  const meta = TIER_UI_METADATA[tierKey] ?? {
    popular: false,
    highlight: null,
    features: {
      fallingNotes: false,
      historyDays: 30,
      sheetEditor: false,
      polyphony: false,
    },
  }

  const price =
    billingCycle === 'yearly'
      ? (plan.yearlyPrice ?? plan.monthlyPrice * 12)
      : plan.monthlyPrice
  const priceId =
    billingCycle === 'yearly'
      ? (plan.yearlyPriceId ?? plan.monthlyPriceId)
      : plan.monthlyPriceId

  const isCurrent = tierStatus === 'current'
  const isDowngrade = tierStatus === 'downgrade'
  const isUpgrade = tierStatus === 'upgrade'

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-2xl border bg-card transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-4 animation-duration-[500ms]',
        isCurrent
          ? 'border-primary/60 shadow-lg shadow-primary/10'
          : meta.popular && !isDowngrade
            ? 'border-primary/50 shadow-lg shadow-primary/10 scale-105 z-10'
            : 'border-border hover:border-primary/30 hover:shadow-lg',
        isDowngrade && 'opacity-50',
      )}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {isCurrent && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground px-4 py-1 shadow-lg">
            <Check className="size-3 mr-1" />
            Plan actuel
          </Badge>
        </div>
      )}
      {!isCurrent && meta.popular && !isDowngrade && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground px-4 py-1 shadow-lg">
            <Sparkles className="size-3 mr-1" />
            {meta.highlight}
          </Badge>
        </div>
      )}
      {!isCurrent && !meta.popular && meta.highlight && !isDowngrade && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <Badge
            variant="outline"
            className="px-4 py-1 shadow-lg border-primary text-primary bg-background"
          >
            {meta.highlight}
          </Badge>
        </div>
      )}

      <div className="p-8">
        <div className="mb-6">
          <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        </div>

        <div className="mb-8">
          {billingCycle === 'yearly' ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-muted-foreground line-through">
                  {formatAmount(plan.monthlyPrice * 12)}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-5xl font-bold tracking-tight">
                  {formatAmount(price)}
                </span>
                <span className="text-muted-foreground">/an</span>
              </div>
            </>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold tracking-tight">
                {formatAmount(price)}
              </span>
              <span className="text-muted-foreground">/mois</span>
            </div>
          )}
        </div>

        {isCurrent ? (
          <div className="h-12 mb-8 flex items-center justify-center">
            <span className="text-sm text-muted-foreground font-medium">
              Votre plan actuel
            </span>
          </div>
        ) : isDowngrade ? (
          <div className="h-12 mb-8" />
        ) : (
          <Button
            size="lg"
            variant={meta.popular || isUpgrade ? 'default' : 'outline'}
            className="w-full mb-8 group-hover:scale-105 transition-transform"
            onClick={() => onAction(priceId)}
            disabled={loading || !priceId}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Chargement...
              </>
            ) : isUpgrade ? (
              <>
                <ArrowUp className="size-4 mr-2" />
                Passer à {plan.name}
              </>
            ) : (
              `Commencer avec ${plan.name}`
            )}
          </Button>
        )}

        <div className="space-y-4">
          <FeatureItem
            icon={Clock}
            label="Transcription"
            value={`${plan.transcriptionMinutes} min/mois`}
          />
          <FeatureItem
            icon={Music}
            label="Touches qui tombent"
            value={meta.features.fallingNotes}
          />
          <FeatureItem
            icon={Calendar}
            label="Historique"
            value={
              meta.features.historyDays === 'unlimited'
                ? 'Illimité'
                : `${meta.features.historyDays} jours`
            }
          />
          <FeatureItem
            icon={Edit}
            label="Éditeur de partition"
            value={meta.features.sheetEditor}
          />
          <FeatureItem
            icon={Layers}
            label="Polyphonie"
            value={meta.features.polyphony}
          />
        </div>
      </div>

      {(meta.popular || isCurrent) && (
        <div className="absolute inset-0 -z-10 rounded-2xl bg-linear-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
      )}
    </div>
  )
}

function getTierStatus(
  plan: SubscriptionPlanDTO,
  index: number,
  props: Props,
): TierStatus {
  if (props.mode === 'subscribe') return 'subscribe'
  const normalizedCurrent =
    Object.keys(TIER_ORDER).find((k) =>
      props.currentPlan.toLowerCase().includes(k),
    ) ?? ''
  const currentIndex = TIER_ORDER[normalizedCurrent] ?? -1
  if (index === currentIndex) return 'current'
  if (index > currentIndex) return 'upgrade'
  return 'downgrade'
}

export function PricingTiersSection(props: Props) {
  const defaultCycle =
    props.mode === 'manage'
      ? props.isYearly
        ? 'yearly'
        : 'monthly'
      : 'monthly'
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(defaultCycle)

  const sortedPlans = [...props.plans].sort(
    (a, b) =>
      (TIER_ORDER[a.name.toLowerCase()] ?? 99) -
      (TIER_ORDER[b.name.toLowerCase()] ?? 99),
  )

  return (
    <div className="space-y-8">
      {props.mode === 'subscribe' && (
        <div className="flex justify-center">
          <Tabs
            value={billingCycle}
            onValueChange={(v) => setBillingCycle(v as BillingCycle)}
          >
            <TabsList className="grid w-fit grid-cols-2">
              <TabsTrigger value="monthly">Mensuel</TabsTrigger>
              <TabsTrigger value="yearly">Annuel</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {sortedPlans.map((plan, index) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            billingCycle={billingCycle}
            index={index}
            tierStatus={getTierStatus(plan, index, props)}
            onAction={props.onAction}
            loading={props.loading}
          />
        ))}
      </div>
    </div>
  )
}
