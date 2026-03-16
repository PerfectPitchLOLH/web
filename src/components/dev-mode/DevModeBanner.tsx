'use client'

import { AlertTriangle } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useDevMode } from '@/contexts/DevModeContext'

export function DevModeBanner() {
  const { config, isActive } = useDevMode()

  if (!isActive || !config) {
    return null
  }

  return (
    <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
      <AlertTriangle className="size-4 text-orange-600 dark:text-orange-400" />
      <AlertDescription className="flex items-center gap-2 text-sm">
        <span className="font-medium text-orange-900 dark:text-orange-100">
          Mode développeur actif:
        </span>
        <Badge
          variant="outline"
          className="border-orange-600 bg-orange-100 capitalize text-orange-900 dark:bg-orange-900/30 dark:text-orange-100"
        >
          {config.subscription.tier}
        </Badge>
        <Badge
          variant="outline"
          className="border-orange-600 bg-orange-100 capitalize text-orange-900 dark:bg-orange-900/30 dark:text-orange-100"
        >
          {config.subscription.status}
        </Badge>
        <span className="text-orange-700 dark:text-orange-300">
          ({config.credits.available} crédits)
        </span>
      </AlertDescription>
    </Alert>
  )
}
