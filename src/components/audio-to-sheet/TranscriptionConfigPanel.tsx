'use client'

import { ChevronRight, CreditCard, Loader2, Music } from 'lucide-react'

import { InstrumentChips } from '@/components/audio-to-sheet/InstrumentChips'
import { PartitionFormatPicker } from '@/components/audio-to-sheet/PartitionFormatPicker'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/ui/inline-alert'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type {
  InstrumentType,
  PartitionType,
  TranscribeConfig,
} from '@/server/domains/transcription/transcription.types'

interface TranscriptionConfigPanelProps {
  config: TranscribeConfig
  onInstrumentChange: (instrument: InstrumentType) => void
  onFormatChange: (format: PartitionType) => void
  onSeparationChange: (checked: boolean) => void
  onPolyphonicChange: (checked: boolean) => void
  isProcessing: boolean
  error: string | null
  outOfCredits: boolean
  insufficientCredits: boolean
  costSeconds: number | null
  remainingSeconds: number | null
  onTranscribe: () => void
}

export function TranscriptionConfigPanel({
  config,
  onInstrumentChange,
  onFormatChange,
  onSeparationChange,
  onPolyphonicChange,
  isProcessing,
  error,
  outOfCredits,
  insufficientCredits,
  costSeconds,
  remainingSeconds,
  onTranscribe,
}: TranscriptionConfigPanelProps) {
  const costLabel =
    costSeconds !== null
      ? `Coût : ~${Math.max(1, Math.ceil(costSeconds / 60))} min de crédits`
      : 'Coût : selon la durée du morceau'

  return (
    <section className="flex flex-col gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <div className="space-y-2">
        <p className="text-sm font-medium">Instrument à transcrire</p>
        <InstrumentChips
          value={config.instrument_type}
          onChange={onInstrumentChange}
          disabled={isProcessing}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Format de partition</p>
        <PartitionFormatPicker
          value={config.partition_type}
          instrument={config.instrument_type}
          mode={config.instrument_mode}
          onChange={onFormatChange}
          disabled={isProcessing}
        />
      </div>

      <Accordion type="single" collapsible className="rounded-lg border px-4">
        <AccordionItem value="advanced" className="border-none">
          <AccordionTrigger className="text-sm py-3 hover:no-underline">
            Options avancées
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="separation-switch" className="text-sm">
                  Séparation de pistes
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Isole l’instrument du reste du mix — recommandé pour les
                  morceaux complets
                </p>
              </div>
              <Switch
                id="separation-switch"
                checked={config.instrument_mode === 'multiple'}
                onCheckedChange={onSeparationChange}
                disabled={isProcessing}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="polyphonic-switch" className="text-sm">
                  Polyphonie
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Détecte plusieurs notes jouées en même temps (accords)
                </p>
              </div>
              <Switch
                id="polyphonic-switch"
                checked={config.polyphonic}
                onCheckedChange={onPolyphonicChange}
                disabled={isProcessing}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="sticky bottom-4 lg:static rounded-xl border bg-card p-4 space-y-3 shadow-lg lg:shadow-none">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{costLabel}</span>
          {remainingSeconds !== null && (
            <span className="tabular-nums">
              Solde : {Math.floor(remainingSeconds / 60)} min
            </span>
          )}
        </div>

        {outOfCredits && (
          <InlineAlert
            message="Crédits insuffisants."
            icon={<CreditCard className="h-4 w-4" />}
            compact
            action={{
              label: 'Acheter des crédits',
              href: '/dashboard/subscription',
            }}
          />
        )}

        {!outOfCredits && insufficientCredits && (
          <InlineAlert
            message="Votre solde ne couvre pas la durée de ce fichier."
            icon={<CreditCard className="h-4 w-4" />}
            compact
            action={{
              label: 'Acheter des crédits',
              href: '/dashboard/subscription',
            }}
          />
        )}

        {!outOfCredits && !insufficientCredits && error && (
          <InlineAlert message={error} compact />
        )}

        <Button
          disabled={isProcessing || outOfCredits || insufficientCredits}
          className="w-full h-11"
          onClick={onTranscribe}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Lancement...
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
    </section>
  )
}
