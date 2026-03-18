'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDevMode } from '@/contexts/DevModeContext'
import { PLAN_FEATURES } from '@/server/domains/subscription/subscription.constants'
import type { SubscriptionPlanTier } from '@/server/domains/subscription/subscription.types'

type DevModeFormProps = {
  onSuccess?: () => void
}

const TIER_MAX_CREDITS: Record<SubscriptionPlanTier, number> = {
  junior: PLAN_FEATURES.junior.transcriptionMinutes,
  basic: PLAN_FEATURES.basic.transcriptionMinutes,
  pro: PLAN_FEATURES.pro.transcriptionMinutes,
}

export function DevModeForm({ onSuccess }: DevModeFormProps) {
  const { activate } = useDevMode()
  const [tier, setTier] = useState<SubscriptionPlanTier>('basic')
  const [monthlyCredits, setMonthlyCredits] = useState(20)
  const [bonusCredits, setBonusCredits] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const maxMonthlyCredits = TIER_MAX_CREDITS[tier]

  useEffect(() => {
    if (monthlyCredits > maxMonthlyCredits) {
      setMonthlyCredits(maxMonthlyCredits)
    }
  }, [tier, maxMonthlyCredits, monthlyCredits])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await activate({
        tier,
        monthlyCredits,
        bonusCredits,
      })
      onSuccess?.()
    } catch (error) {
      console.error('Failed to activate dev mode:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tier">Type d&apos;abonnement</Label>
        <Select
          value={tier}
          onValueChange={(v) => setTier(v as SubscriptionPlanTier)}
        >
          <SelectTrigger id="tier">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="junior">Junior (10 min/mois)</SelectItem>
            <SelectItem value="basic">Basic (20 min/mois)</SelectItem>
            <SelectItem value="pro">Pro (50 min/mois)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="monthlyCredits">
          Crédits mensuels restants (max {maxMonthlyCredits} min)
        </Label>
        <div className="relative">
          <Input
            id="monthlyCredits"
            type="number"
            min="0"
            max={maxMonthlyCredits}
            value={monthlyCredits}
            onChange={(e) => setMonthlyCredits(Number(e.target.value))}
            className="pr-12"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            min
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bonusCredits">Crédits bonus achetés (en minutes)</Label>
        <div className="relative">
          <Input
            id="bonusCredits"
            type="number"
            min="0"
            value={bonusCredits}
            onChange={(e) => setBonusCredits(Number(e.target.value))}
            className="pr-12"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            min
          </span>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Activation...' : 'Activer le mode dev'}
      </Button>
    </form>
  )
}
