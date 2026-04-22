'use client'

import { Loader2 } from 'lucide-react'

import { TranscriptionFailedView } from '@/components/audio-to-sheet/TranscriptionFailedView'
import { TranscriptionProcessingView } from '@/components/audio-to-sheet/TranscriptionProcessingView'
import { TranscriptionResultView } from '@/components/audio-to-sheet/TranscriptionResultView'
import { useJobActions } from '@/hooks/useJobActions'
import { useJobProgress } from '@/hooks/useJobProgress'
import { useJobSession } from '@/hooks/useJobSession'
import { useSvgContent } from '@/hooks/useSvgContent'

type Props = {
  jobId: string
}

export function JobPageContent({ jobId }: Props) {
  const {
    progress,
    step: currentStep,
    status,
    results,
    error,
    isInitialLoading,
  } = useJobProgress(jobId)
  const svgContent = useSvgContent(results, jobId, status)
  const { savedPartitionId, jobTitle, handleSaved } = useJobSession(
    jobId,
    results,
    status,
  )
  const { isCancelling, handleCancel, handleReset } = useJobActions(jobId)

  const resolvedTitle = results?.title ?? jobTitle ?? null

  if (isInitialLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2.5 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Chargement de la transcription...</span>
      </div>
    )
  }

  if (status === 'completed' && results) {
    return (
      <TranscriptionResultView
        selectedFile={null}
        svgContent={svgContent}
        savedPartitionId={savedPartitionId}
        config={{
          instrument_mode: 'single',
          instrument_type: 'piano',
          polyphonic: false,
          partition_type: 'classique',
        }}
        jobId={jobId}
        jobTitle={resolvedTitle}
        durationSeconds={results.duration_seconds}
        onReset={handleReset}
        onSaved={handleSaved}
      />
    )
  }

  if (status === 'failed') {
    return <TranscriptionFailedView error={error} onReset={handleReset} />
  }

  return (
    <TranscriptionProcessingView
      progress={progress}
      currentStep={currentStep}
      isCancelling={isCancelling}
      error={error}
      onCancel={handleCancel}
    />
  )
}
