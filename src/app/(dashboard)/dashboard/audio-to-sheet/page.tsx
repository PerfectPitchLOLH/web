'use client'

import { useCallback, useState } from 'react'

import { AudioDropzone } from '@/components/audio-to-sheet/AudioDropzone'
import { ResumeBanner } from '@/components/audio-to-sheet/ResumeBanner'
import { SimilarPartitionDialog } from '@/components/audio-to-sheet/SimilarPartitionDialog'
import { SpotifyInput } from '@/components/audio-to-sheet/SpotifyInput'
import { TranscriptionConfigPanel } from '@/components/audio-to-sheet/TranscriptionConfigPanel'
import { YoutubeInput } from '@/components/audio-to-sheet/YoutubeInput'
import { Button } from '@/components/ui/button'
import { useCredits } from '@/hooks/useCredits'
import { useTranscribeSubmit } from '@/hooks/useTranscribeSubmit'
import { useTranscription } from '@/hooks/useTranscription'
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

type UrlTab = 'youtube' | 'spotify'

export default function AudioToSheetPage() {
  const {
    transcribe,
    transcribeFromYoutube,
    transcribeFromSpotify,
    sessionToResume,
    error,
    reset,
  } = useTranscription()

  const { credits } = useCredits()
  const outOfCredits = credits !== null && credits.remainingCredits <= 0

  const [inputSource, setInputSource] = useState<InputSource>(null)
  const [config, setConfig] = useState<TranscribeConfig>(DEFAULT_CONFIG)
  const [urlTab, setUrlTab] = useState<UrlTab>('youtube')

  const {
    isSubmitting,
    handleTranscribe,
    similarPartitions,
    similarDialogOpen,
    setSimilarDialogOpen,
    handleSimilarConfirm,
  } = useTranscribeSubmit(inputSource, config, {
    transcribe,
    transcribeFromYoutube,
    transcribeFromSpotify,
  })

  const handleYoutubeSelect = useCallback((url: string, videoTitle: string) => {
    setInputSource({ type: 'youtube', url, videoTitle })
  }, [])

  const handleYoutubeRemove = useCallback(() => {
    setInputSource(null)
  }, [])

  const handleSpotifySelect = useCallback((url: string, trackTitle: string) => {
    setInputSource({ type: 'spotify', url, trackTitle })
  }, [])

  const handleSpotifyRemove = useCallback(() => {
    setInputSource(null)
  }, [])

  const handleTabChange = (tab: UrlTab) => {
    setUrlTab(tab)
    setInputSource(null)
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-auto">
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

      <div className="flex flex-1 min-h-0 p-6 gap-6 flex-col lg:flex-row">
        <div className="flex flex-col gap-4 lg:flex-1">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Audio vers Partition
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Convertissez un fichier audio, une vidéo YouTube ou un titre
              Spotify en partition musicale
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            <div className="flex-1">
              <AudioDropzone
                selectedFile={
                  inputSource?.type === 'file' ? inputSource.file : null
                }
                onFileSelect={(file, durationSeconds) =>
                  setInputSource({ type: 'file', file, durationSeconds })
                }
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

            <div className="flex-1 rounded-xl border bg-card p-4 flex flex-col gap-3">
              <div className="flex gap-1">
                <Button
                  variant={urlTab === 'youtube' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => handleTabChange('youtube')}
                  disabled={isSubmitting}
                >
                  YouTube
                </Button>
                <Button
                  variant={urlTab === 'spotify' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => handleTabChange('spotify')}
                  disabled={isSubmitting}
                >
                  Spotify
                </Button>
              </div>

              {urlTab === 'youtube' ? (
                <YoutubeInput
                  inputSource={inputSource}
                  onYoutubeSelect={handleYoutubeSelect}
                  onYoutubeRemove={handleYoutubeRemove}
                  disabled={isSubmitting}
                />
              ) : (
                <SpotifyInput
                  inputSource={inputSource}
                  onSpotifySelect={handleSpotifySelect}
                  onSpotifyRemove={handleSpotifyRemove}
                  disabled={isSubmitting}
                />
              )}
            </div>
          </div>
        </div>

        <TranscriptionConfigPanel
          config={config}
          onConfigChange={setConfig}
          hasSource={inputSource !== null}
          isProcessing={isSubmitting}
          error={error}
          outOfCredits={outOfCredits}
          onTranscribe={handleTranscribe}
        />
      </div>
    </div>
  )
}
