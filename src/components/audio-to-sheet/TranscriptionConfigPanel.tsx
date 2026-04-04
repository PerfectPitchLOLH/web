'use client'

import { ChevronRight, Loader2, Music, XCircle } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import type {
  InstrumentType,
  PartitionType,
  TranscribeConfig,
} from '@/server/domains/transcription/transcription.types'

interface TranscriptionConfigPanelProps {
  config: TranscribeConfig
  onConfigChange: (config: TranscribeConfig) => void
  selectedFile: File | null
  isProcessing: boolean
  error: string | null
  onTranscribe: () => void
}

export function TranscriptionConfigPanel({
  config,
  onConfigChange,
  selectedFile,
  isProcessing,
  error,
  onTranscribe,
}: TranscriptionConfigPanelProps) {
  const handleInstrumentChange = (v: string) => {
    const instrument = v as InstrumentType
    const needsReset =
      (config.partition_type === 'tab_guitare' &&
        instrument !== 'guitar' &&
        instrument !== 'other') ||
      (config.partition_type === 'tab_basse' &&
        instrument !== 'bass' &&
        instrument !== 'other') ||
      (config.partition_type === 'piano' &&
        instrument !== 'piano' &&
        instrument !== 'other')
    onConfigChange({
      ...config,
      instrument_type: instrument,
      partition_type: needsReset ? 'classique' : config.partition_type,
    })
  }

  const handlePartitionTypeChange = (v: string) => {
    const partitionType = v as PartitionType
    let instrument = config.instrument_type
    if (
      partitionType === 'tab_guitare' &&
      instrument !== 'guitar' &&
      instrument !== 'other'
    ) {
      instrument = 'guitar'
    } else if (
      partitionType === 'tab_basse' &&
      instrument !== 'bass' &&
      instrument !== 'other'
    ) {
      instrument = 'bass'
    } else if (
      partitionType === 'piano' &&
      instrument !== 'piano' &&
      instrument !== 'other'
    ) {
      instrument = 'piano'
    }
    onConfigChange({
      ...config,
      partition_type: partitionType,
      instrument_type: instrument,
    })
  }

  return (
    <div className="lg:w-72 shrink-0 flex flex-col gap-4">
      <div className="rounded-xl border bg-card p-5 space-y-5 flex-1">
        <p className="text-sm font-medium">Configuration</p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Instrument
            </label>
            <Select
              value={config.instrument_type}
              onValueChange={handleInstrumentChange}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="piano">Piano</SelectItem>
                <SelectItem value="guitar">Guitare</SelectItem>
                <SelectItem value="bass">Basse</SelectItem>
                <SelectItem value="vocals">Voix</SelectItem>
                <SelectItem value="drums">Batterie</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Format de partition
            </label>
            <Select
              value={config.partition_type}
              onValueChange={handlePartitionTypeChange}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classique">Classique</SelectItem>
                <SelectItem value="piano">Piano</SelectItem>
                <SelectItem value="tab_basse">Tablature Basse</SelectItem>
                <SelectItem value="tab_guitare">Tablature Guitare</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Séparation de pistes</p>
              <p className="text-xs text-muted-foreground">
                Isoler l'instrument du mix
              </p>
            </div>
            <Switch
              checked={config.instrument_mode === 'multiple'}
              onCheckedChange={(checked) => {
                const newMode = checked ? 'multiple' : 'single'
                const tabTypes: PartitionType[] = ['tab_guitare', 'tab_basse']
                const needsReset =
                  checked && tabTypes.includes(config.partition_type)
                onConfigChange({
                  ...config,
                  instrument_mode: newMode,
                  partition_type: needsReset
                    ? 'classique'
                    : config.partition_type,
                })
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Polyphonie</p>
              <p className="text-xs text-muted-foreground">
                Plusieurs notes simultanées
              </p>
            </div>
            <Switch
              checked={config.polyphonic}
              onCheckedChange={(checked) =>
                onConfigChange({ ...config, polyphonic: checked })
              }
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="py-2">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <Button
        disabled={!selectedFile || isProcessing}
        className="w-full h-10"
        onClick={onTranscribe}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            En cours...
          </>
        ) : (
          <>
            <Music className="mr-2 h-4 w-4" />
            Lancer la transcription
            <ChevronRight className="ml-1 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  )
}
