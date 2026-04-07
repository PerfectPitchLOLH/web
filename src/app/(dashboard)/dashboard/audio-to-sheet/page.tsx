'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

import { INSTRUMENT_TO_STEM } from '@/components/audio-to-sheet/audio-to-sheet.constants'
import { AudioDropzone } from '@/components/audio-to-sheet/AudioDropzone'
import { ResumeBanner } from '@/components/audio-to-sheet/ResumeBanner'
import { SpotifyInput } from '@/components/audio-to-sheet/SpotifyInput'
import { TranscriptionConfigPanel } from '@/components/audio-to-sheet/TranscriptionConfigPanel'
import { YoutubeInput } from '@/components/audio-to-sheet/YoutubeInput'
import { Button } from '@/components/ui/button'
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
  const router = useRouter()
  const {
    transcribe,
    transcribeFromYoutube,
    transcribeFromSpotify,
    sessionToResume,
    error,
    reset,
  } = useTranscription()

  const [inputSource, setInputSource] = useState<InputSource>(null)
  const [config, setConfig] = useState<TranscribeConfig>(DEFAULT_CONFIG)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [urlTab, setUrlTab] = useState<UrlTab>('youtube')

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

  const handleTranscribe = async () => {
    if (!inputSource) return

    const configToSend: TranscribeConfig = {
      ...config,
      ...(config.instrument_mode === 'multiple' && {
        target_stem: INSTRUMENT_TO_STEM[config.instrument_type],
      }),
    }

    setIsSubmitting(true)
    try {
      let jobId: string | null = null
      if (inputSource.type === 'file') {
        jobId = await transcribe(inputSource.file, configToSend)
      } else if (inputSource.type === 'youtube') {
        jobId = await transcribeFromYoutube(
          inputSource.url,
          inputSource.videoTitle,
          configToSend,
        )
      } else if (inputSource.type === 'spotify') {
        jobId = await transcribeFromSpotify(
          inputSource.url,
          inputSource.trackTitle,
          configToSend,
        )
      }

      if (jobId) {
        router.push(`/dashboard/audio-to-sheet/${jobId}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-auto">
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
          onTranscribe={handleTranscribe}
        />
      </div>
    </div>
  )
}
