'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { SubscriptionPlanTier } from '@/server/domains/subscription/subscription.types'

type UpgradePromptProps = {
  targetPlan: SubscriptionPlanTier
  reason?: string
}

export function UpgradePrompt({ targetPlan, reason }: UpgradePromptProps) {
  const planNames = {
    junior: 'Junior',
    basic: 'Basic',
    pro: 'Pro',
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-lg">Fonctionnalité Premium</CardTitle>
        <CardDescription>
          {reason ||
            `Cette fonctionnalité nécessite un abonnement ${planNames[targetPlan]}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/dashboard/subscription">
          <Button>
            Passer au plan {planNames[targetPlan]}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
