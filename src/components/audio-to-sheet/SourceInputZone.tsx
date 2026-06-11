'use client'

import { ClipboardPaste, Upload } from 'lucide-react'

import { SelectedFileCard } from '@/components/audio-to-sheet/SelectedFileCard'
import { SpotifyPreviewCard } from '@/components/audio-to-sheet/SpotifyPreviewCard'
import { YoutubePreviewCard } from '@/components/audio-to-sheet/YoutubePreviewCard'
import { Input } from '@/components/ui/input'
import { useAudioDropzone } from '@/hooks/useAudioDropzone'
import type { DetectedUrlType } from '@/hooks/useUnifiedUrlInput'
import {
  extractYoutubeVideoId,
  useUnifiedUrlInput,
} from '@/hooks/useUnifiedUrlInput'
import type { InputSource } from '@/server/domains/transcription/transcription.types'

interface SourceInputZoneProps {
  inputSource: InputSource
  onFileSelect: (file: File, durationSeconds?: number) => void
  onUrlSelect: (type: DetectedUrlType, url: string, title: string) => void
  onRemove: () => void
  disabled?: boolean
}

export function SourceInputZone({
  inputSource,
  onFileSelect,
  onUrlSelect,
  onRemove,
  disabled,
}: SourceInputZoneProps) {
  const {
    isDragOver,
    fileInputRef,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    openFilePicker,
    handleInputChange,
  } = useAudioDropzone(onFileSelect)

  const { urlValue, setUrlValue, isInvalid, fetchError, preview, clear } =
    useUnifiedUrlInput(inputSource, onUrlSelect, onRemove)

  if (inputSource?.type === 'file') {
    return (
      <SelectedFileCard
        file={inputSource.file}
        durationSeconds={inputSource.durationSeconds}
        onRemove={() => {
          onRemove()
          if (fileInputRef.current) fileInputRef.current.value = ''
        }}
        disabled={disabled}
      />
    )
  }

  if (inputSource?.type === 'youtube') {
    return (
      <div className="flex flex-col gap-2">
        <YoutubePreviewCard
          thumbnailUrl={
            preview?.thumbnail_url ??
            `https://i.ytimg.com/vi/${extractYoutubeVideoId(inputSource.url)}/hqdefault.jpg`
          }
          title={preview?.title ?? inputSource.videoTitle}
          channelName={preview?.author_name ?? ''}
          onRemove={clear}
        />
        {fetchError && (
          <p className="text-xs text-muted-foreground">{fetchError}</p>
        )}
      </div>
    )
  }

  if (inputSource?.type === 'spotify') {
    return (
      <div className="flex flex-col gap-2">
        <SpotifyPreviewCard
          thumbnailUrl={preview?.thumbnail_url ?? ''}
          title={preview?.title ?? inputSource.trackTitle}
          artistName={preview?.author_name ?? ''}
          onRemove={clear}
        />
        {fetchError && (
          <p className="text-xs text-muted-foreground">{fetchError}</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleInputChange}
      />
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed transition-all ${
          isDragOver
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-muted-foreground/25'
        }`}
      >
        <div
          role="button"
          tabIndex={0}
          aria-label="Importer un fichier audio"
          onClick={() => !disabled && openFilePicker()}
          onKeyDown={(e) => {
            if (disabled) return
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              openFilePicker()
            }
          }}
          className="flex flex-col items-center gap-3 px-6 pt-10 pb-8 text-center cursor-pointer rounded-t-xl hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        >
          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">
              {isDragOver
                ? 'Relâchez pour importer'
                : 'Glissez votre fichier audio ici'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              ou{' '}
              <span className="text-primary underline underline-offset-2">
                cliquez pour parcourir
              </span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground/70">
            MP3, WAV, FLAC, M4A, OGG
          </p>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">
              ou collez un lien YouTube / Spotify
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <Input
            placeholder="https://youtube.com/watch?v=...  ·  https://open.spotify.com/track/..."
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            disabled={disabled}
            aria-label="Lien YouTube ou Spotify"
            aria-invalid={isInvalid}
            className={
              isInvalid
                ? 'border-destructive focus-visible:ring-destructive'
                : ''
            }
          />
          {isInvalid && (
            <p className="text-xs text-destructive" role="alert">
              Lien non reconnu — collez un lien YouTube ou Spotify (morceau)
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground/70 flex items-center justify-center gap-1.5">
        <ClipboardPaste className="h-3 w-3" />
        Astuce : collez un lien n’importe où sur la page (Ctrl+V)
      </p>
    </div>
  )
}
