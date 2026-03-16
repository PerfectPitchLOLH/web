'use client'

import { Loader2, Power, PowerOff } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDevMode } from '@/contexts/DevModeContext'
import type { DevModePreset } from '@/server/domains/dev-mode/dev-mode.types'

type DevModePanelProps = {
  onClose?: () => void
}

export function DevModePanel({ onClose }: DevModePanelProps) {
  const { config, isActive, activatePreset, deactivate } = useDevMode()
  const [presets, setPresets] = useState<DevModePreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingPresets, setIsFetchingPresets] = useState(true)

  useEffect(() => {
    async function fetchPresets() {
      try {
        const response = await fetch('/api/dev-mode/presets')
        if (response.ok) {
          const data = await response.json()
          setPresets(data.data?.presets ?? [])
        }
      } catch (error) {
        console.error('Failed to fetch presets:', error)
      } finally {
        setIsFetchingPresets(false)
      }
    }

    fetchPresets()
  }, [])

  const handleActivatePreset = async () => {
    if (!selectedPreset) return

    setIsLoading(true)
    try {
      await activatePreset(selectedPreset)
      onClose?.()
    } catch (error) {
      console.error('Failed to activate preset:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeactivate = async () => {
    setIsLoading(true)
    try {
      await deactivate()
      onClose?.()
    } catch (error) {
      console.error('Failed to deactivate:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {isActive && config && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Power className="size-4 text-green-500" />
            <span className="font-semibold">Mode actif</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Abonnement:</span>
              <Badge variant="outline" className="capitalize">
                {config.subscription.tier}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Statut:</span>
              <Badge
                variant={
                  config.subscription.status === 'active'
                    ? 'default'
                    : 'secondary'
                }
                className="capitalize"
              >
                {config.subscription.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Intervalle:</span>
              <span className="capitalize">
                {config.subscription.billingInterval}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Crédits:</span>
              <span className="font-medium">{config.credits.available}</span>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeactivate}
            disabled={isLoading}
            className="mt-4 w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Désactivation...
              </>
            ) : (
              <>
                <PowerOff className="mr-2 size-4" />
                Désactiver le mode dev
              </>
            )}
          </Button>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="preset-select">
            Choisir un preset de configuration
          </Label>
          <Select
            value={selectedPreset}
            onValueChange={setSelectedPreset}
            disabled={isFetchingPresets}
          >
            <SelectTrigger id="preset-select">
              <SelectValue
                placeholder={
                  isFetchingPresets ? 'Chargement...' : 'Sélectionner un preset'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {presets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{preset.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {preset.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleActivatePreset}
          disabled={!selectedPreset || isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Activation...
            </>
          ) : (
            <>
              <Power className="mr-2 size-4" />
              Activer ce preset
            </>
          )}
        </Button>
      </div>

      {selectedPreset && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <h4 className="mb-2 text-sm font-semibold">
            Aperçu de la configuration
          </h4>
          {presets
            .filter((p) => p.id === selectedPreset)
            .map((preset) => (
              <div key={preset.id} className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tier:</span>
                  <span className="capitalize">
                    {preset.config.subscription.tier}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Statut:</span>
                  <span className="capitalize">
                    {preset.config.subscription.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Crédits:</span>
                  <span>{preset.config.credits.available}</span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
