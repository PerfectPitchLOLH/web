'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { INSTRUMENT_TO_STEM } from '@/components/audio-to-sheet/audio-to-sheet.constants'
import { AudioDropzone } from '@/components/audio-to-sheet/AudioDropzone'
import { ResumeBanner } from '@/components/audio-to-sheet/ResumeBanner'
import { TranscriptionConfigPanel } from '@/components/audio-to-sheet/TranscriptionConfigPanel'
import { TranscriptionFailedView } from '@/components/audio-to-sheet/TranscriptionFailedView'
import { TranscriptionProcessingView } from '@/components/audio-to-sheet/TranscriptionProcessingView'
import { TranscriptionResultView } from '@/components/audio-to-sheet/TranscriptionResultView'
import { YoutubeInput } from '@/components/audio-to-sheet/YoutubeInput'
import { useSvgContent } from '@/hooks/useSvgContent'
import { useTranscription } from '@/hooks/useTranscription'
import { clearSession } from '@/lib/transcription-session'
import type {
  InputSource,
  TranscribeConfig,
} from '@/server/domains/transcription/transcription.types'

const DEFAULT_CONFIG: TranscribeConfig = {
  instrument_mode: 'single',
  instrument_type: 'piano',
  polyphonic: false,
  partition_type: 'classique',
}

export default function AudioToSheetPage() {
  const {
    transcribe,
    transcribeFromYoutube,
    resumeSession,
    cancel,
    jobId,
    jobTitle,
    status,
    progress,
    currentStep,
    results,
    error,
    isProcessing,
    isCancelling,
    sessionToResume,
    reset,
  } = useTranscription()

  const svgContent = useSvgContent(results, jobId, status)

  const [inputSource, setInputSource] = useState<InputSource>(null)
  const [config, setConfig] = useState<TranscribeConfig>(DEFAULT_CONFIG)
  const [savedPartitionId, setSavedPartitionId] = useState<string | null>(null)

  const handleReset = () => {
    reset()
    setInputSource(null)
    setSavedPartitionId(null)
    setConfig(DEFAULT_CONFIG)
  }

  const handleSaved = (partitionId: string) => {
    setSavedPartitionId(partitionId)
    toast.success('Partition sauvegardée !', {
      description: 'Retrouvez-la dans votre bibliothèque.',
      action: {
        label: 'Voir →',
        onClick: () => {
          window.location.href = '/dashboard/partitions'
        },
      },
      duration: 6000,
    })
  }

  const handleTranscribe = async () => {
    if (!inputSource) return

    const configToSend: TranscribeConfig = {
      ...config,
      ...(config.instrument_mode === 'multiple' && {
        target_stem: INSTRUMENT_TO_STEM[config.instrument_type],
      }),
    }

    if (inputSource.type === 'file') {
      await transcribe(inputSource.file, configToSend)
    } else {
      await transcribeFromYoutube(
        inputSource.url,
        inputSource.videoTitle,
        configToSend,
      )
    }
  }

  if (jobId && status === 'completed' && results) {
    return (
      <TranscriptionResultView
        selectedFile={inputSource?.type === 'file' ? inputSource.file : null}
        svgContent={svgContent}
        savedPartitionId={savedPartitionId}
        config={config}
        jobId={jobId}
        jobTitle={jobTitle}
        durationSeconds={results.duration_seconds}
        onReset={handleReset}
        onSaved={handleSaved}
      />
    )
  }

  if (jobId && isProcessing) {
    return (
      <TranscriptionProcessingView
        progress={progress}
        currentStep={currentStep}
        isCancelling={isCancelling}
        error={error}
        onCancel={cancel}
      />
    )
  }

  if (jobId && status === 'failed') {
    return <TranscriptionFailedView error={error} onReset={handleReset} />
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-auto">
      {sessionToResume && !jobId && (
        <div className="px-6 pt-4 shrink-0">
          <ResumeBanner
            session={sessionToResume}
            onResume={resumeSession}
            onDismiss={() => {
              clearSession()
              reset()
            }}
          />
        </div>
      )}

      <div className="flex flex-1 min-h-0 p-6 gap-6 flex-col lg:flex-row">
        <div className="flex flex-col gap-4 lg:flex-1">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Audio vers Partition
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Convertissez un fichier audio ou une vidéo YouTube en partition
              musicale
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            <div className="flex-1">
              <AudioDropzone
                selectedFile={
                  inputSource?.type === 'file' ? inputSource.file : null
                }
                onFileSelect={(file) => setInputSource({ type: 'file', file })}
                onFileRemove={() => setInputSource(null)}
              />
            </div>

            <div className="flex items-center justify-center md:flex-col gap-2 shrink-0">
              <div className="flex-1 md:w-px md:h-full w-full h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium px-1">
                ou
              </span>
              <div className="flex-1 md:w-px md:h-full w-full h-px bg-border" />
            </div>

            <div className="flex-1 rounded-xl border bg-card p-4 flex flex-col justify-center">
              <YoutubeInput
                inputSource={inputSource}
                onYoutubeSelect={(url, videoTitle) =>
                  setInputSource({ type: 'youtube', url, videoTitle })
                }
                onYoutubeRemove={() => setInputSource(null)}
                disabled={isProcessing}
              />
            </div>
          </div>
        </div>

        <TranscriptionConfigPanel
          config={config}
          onConfigChange={setConfig}
          hasSource={inputSource !== null}
          isProcessing={isProcessing}
          error={error}
          onTranscribe={handleTranscribe}
        />
      </div>
    </div>
  )
}
