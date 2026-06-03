'use client'

import { Bug, LogOut } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { useDevMode } from '@/contexts/DevModeContext'

export function DevModeBox() {
  const { isActive, config, deactivate } = useDevMode()
  const [isLoading, setIsLoading] = useState(false)

  if (!isActive || !config) {
    return null
  }

  const handleExit = async () => {
    setIsLoading(true)

    try {
      await deactivate()
    } catch (error) {
      console.error('Failed to deactivate dev mode:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const tierColors = {
    junior: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100',
    basic:
      'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-100',
    pro: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100',
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 rounded-lg border border-orange-300 bg-orange-100 px-4 py-3 shadow-lg dark:border-orange-800 dark:bg-orange-950">
      <div className="flex items-center gap-2">
        <Bug className="size-4 text-orange-700 dark:text-orange-300" />
        <p className="text-sm font-bold text-orange-900 dark:text-orange-100">
          Mode Développeur
        </p>
      </div>

      <div className="space-y-1.5 text-xs text-orange-800 dark:text-orange-200">
        <div className="flex items-center gap-2">
          <span className="font-medium">Abonnement :</span>
          <Badge
            variant="outline"
            className={tierColors[config.subscription.tier]}
          >
            {config.subscription.tier.charAt(0).toUpperCase() +
              config.subscription.tier.slice(1)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Crédits mensuels :</span>
          <span>{config.credits.monthly} min</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Crédits bonus :</span>
          <span>{config.credits.bonus} min</span>
        </div>
      </div>

      <button
        onClick={handleExit}
        disabled={isLoading}
        className="mt-1 flex items-center justify-center gap-1.5 rounded-md bg-orange-200 px-3 py-1.5 text-xs font-medium text-orange-900 transition-colors hover:bg-orange-300 disabled:opacity-50 dark:bg-orange-900 dark:text-orange-100 dark:hover:bg-orange-800"
      >
        <LogOut className="size-3" />
        Quitter
      </button>
    </div>
  )
}
