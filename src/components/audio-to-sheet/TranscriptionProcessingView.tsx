'use client'

import { CheckCircle2, Loader2, Music, StopCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/ui/inline-alert'
import { Progress } from '@/components/ui/progress'
import { useProcessingEta } from '@/hooks/useProcessingEta'
import {
  PROCESSING_STEP_LABELS,
  type ProcessingStep,
} from '@/server/domains/transcription/transcription.types'

import { STEP_ICONS, STEPS } from './audio-to-sheet.constants'

interface TranscriptionProcessingViewProps {
  progress: number
  currentStep: ProcessingStep | null
  isCancelling: boolean
  error: string | null
  onCancel: () => void
}

export function TranscriptionProcessingView({
  progress,
  currentStep,
  isCancelling,
  error,
  onCancel,
}: TranscriptionProcessingViewProps) {
  const currentStepIndex = currentStep ? STEPS.indexOf(currentStep) : -1
  const eta = useProcessingEta(progress)

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 min-h-0">
      <div className="w-full max-w-xs space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="relative">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Music className="h-7 w-7 text-primary" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-40" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-primary" />
              </span>
            </div>
          </div>
          <p className="font-semibold text-lg">Transcription en cours</p>
          <div className="space-y-1.5">
            <Progress value={progress} className="h-1" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {eta ? `Temps restant : ${eta}` : 'Estimation du temps...'}
              </span>
              <span className="tabular-nums">{progress}%</span>
            </div>
          </div>
        </div>

        <div>
          {STEPS.slice(0, -1).map((step, i) => {
            const isDone = i < currentStepIndex
            const isCurrent = i === currentStepIndex
            const isLast = i === STEPS.length - 2
            const isActive = isDone || isCurrent
            const StepIcon = STEP_ICONS[step]

            return (
              <div key={step} className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                      isActive
                        ? 'bg-primary/10 border border-primary/40'
                        : 'bg-muted border border-border'
                    } ${isCurrent ? 'ring-4 ring-primary/15' : ''}`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    ) : isCurrent ? (
                      <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                    ) : StepIcon ? (
                      <StepIcon className="h-3.5 w-3.5 text-muted-foreground/30" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/25" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={`w-px flex-1 min-h-5 my-1 transition-colors duration-700 ${
                        isDone ? 'bg-primary/40' : 'bg-border'
                      }`}
                    />
                  )}
                </div>

                <div className={`pt-1 ${isLast ? '' : 'pb-4'}`}>
                  <p
                    className={`text-sm font-medium leading-none transition-all duration-300 ${
                      isActive ? 'text-primary' : 'text-muted-foreground/40'
                    }`}
                  >
                    {PROCESSING_STEP_LABELS[step]}
                  </p>
                  {isDone && (
                    <p className="text-xs text-primary/60 mt-1">Terminé</p>
                  )}
                  {isCurrent && (
                    <p className="text-xs text-primary/60 mt-1 animate-pulse">
                      En cours...
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground text-center">
            Vous pouvez quitter cette page — la transcription continue en
            arrière-plan.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-muted-foreground"
            disabled={isCancelling}
            onClick={onCancel}
          >
            {isCancelling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Annulation...
              </>
            ) : (
              <>
                <StopCircle className="mr-2 h-4 w-4" />
                Arrêter la transcription
              </>
            )}
          </Button>
        </div>

        {error && <InlineAlert message={error} />}
      </div>
    </div>
  )
}
