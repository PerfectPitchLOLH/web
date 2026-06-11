'use client'

import { CreditCard } from 'lucide-react'

import { ResumeBanner } from '@/components/audio-to-sheet/ResumeBanner'
import { SimilarPartitionDialog } from '@/components/audio-to-sheet/SimilarPartitionDialog'
import { SourceInputZone } from '@/components/audio-to-sheet/SourceInputZone'
import { TranscriptionConfigPanel } from '@/components/audio-to-sheet/TranscriptionConfigPanel'
import { InlineAlert } from '@/components/ui/inline-alert'
import { useAudioToSheetPage } from '@/hooks/useAudioToSheetPage'

export function AudioToSheetContent() {
  const {
    inputSource,
    config,
    outOfCredits,
    insufficientCredits,
    costSeconds,
    remainingSeconds,
    sessionToResume,
    error,
    reset,
    isSubmitting,
    handleTranscribe,
    similarPartitions,
    similarDialogOpen,
    setSimilarDialogOpen,
    handleSimilarConfirm,
    handleFileSelect,
    handleUrlSelect,
    handleSourceRemove,
    handleInstrumentChange,
    handleFormatChange,
    handleSeparationChange,
    handlePolyphonicChange,
  } = useAudioToSheetPage()

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <SimilarPartitionDialog
        open={similarDialogOpen}
        onOpenChange={setSimilarDialogOpen}
        similarPartitions={similarPartitions}
        onConfirm={handleSimilarConfirm}
      />

      {sessionToResume && (
        <div className="px-6 pt-4 shrink-0">
          <ResumeBanner
            session={sessionToResume}
            resumeHref={`/dashboard/audio-to-sheet/${sessionToResume.jobId}`}
            onDismiss={reset}
          />
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col">
        {!inputSource ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
            <div className="w-full max-w-xl flex flex-col gap-6">
              <header className="text-center space-y-1.5">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Audio vers Partition
                </h1>
                <p className="text-sm text-muted-foreground">
                  Glissez un fichier ou collez un lien — obtenez votre partition
                  en quelques minutes
                </p>
              </header>

              <SourceInputZone
                inputSource={inputSource}
                onFileSelect={handleFileSelect}
                onUrlSelect={handleUrlSelect}
                onRemove={handleSourceRemove}
                disabled={isSubmitting}
              />

              {outOfCredits && (
                <InlineAlert
                  message="Crédits insuffisants pour lancer une transcription."
                  icon={<CreditCard className="h-4 w-4" />}
                  compact
                  action={{
                    label: 'Acheter des crédits',
                    href: '/dashboard/subscription',
                  }}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 w-full max-w-5xl mx-auto flex flex-col lg:flex-row lg:items-center gap-6 px-6 py-6">
            <div className="lg:flex-1 flex flex-col justify-center gap-4 min-w-0">
              <header className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Audio vers Partition
                </h1>
                <p className="text-sm text-muted-foreground">
                  Vérifiez votre audio, choisissez l’instrument et le format,
                  puis lancez la transcription
                </p>
              </header>

              <SourceInputZone
                inputSource={inputSource}
                onFileSelect={handleFileSelect}
                onUrlSelect={handleUrlSelect}
                onRemove={handleSourceRemove}
                disabled={isSubmitting}
              />
            </div>

            <div className="lg:w-[380px] shrink-0 lg:max-h-full lg:overflow-y-auto lg:py-1">
              <TranscriptionConfigPanel
                config={config}
                onInstrumentChange={handleInstrumentChange}
                onFormatChange={handleFormatChange}
                onSeparationChange={handleSeparationChange}
                onPolyphonicChange={handlePolyphonicChange}
                isProcessing={isSubmitting}
                error={error}
                outOfCredits={outOfCredits}
                insufficientCredits={insufficientCredits}
                costSeconds={costSeconds}
                remainingSeconds={remainingSeconds}
                onTranscribe={handleTranscribe}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
