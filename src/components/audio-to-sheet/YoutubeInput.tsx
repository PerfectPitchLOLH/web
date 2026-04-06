'use client'

import { Youtube } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { InputSource } from '@/server/domains/transcription/transcription.types'
import { YOUTUBE_URL_REGEX } from '@/server/domains/transcription/transcription.types'

import { YoutubePreviewCard } from './YoutubePreviewCard'

interface YoutubeInputProps {
  inputSource: InputSource
  onYoutubeSelect: (url: string, videoTitle: string) => void
  onYoutubeRemove: () => void
  disabled?: boolean
}

interface OEmbedData {
  title: string
  author_name: string
  thumbnail_url: string
}

function YoutubePreviewSkeleton() {
  return (
    <div className="flex gap-3 rounded-lg border bg-muted/40 p-3 items-start">
      <Skeleton className="shrink-0 w-28 aspect-video rounded" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

export function YoutubeInput({
  inputSource,
  onYoutubeSelect,
  onYoutubeRemove,
  disabled,
}: YoutubeInputProps) {
  const [urlValue, setUrlValue] = useState('')
  const [isValidUrl, setIsValidUrl] = useState<boolean | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [preview, setPreview] = useState<OEmbedData | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isYoutubeSource = inputSource?.type === 'youtube'

  useEffect(() => {
    if (!urlValue) {
      setIsValidUrl(null)
      setFetchError(null)
      setPreview(null)
      return
    }

    const valid = YOUTUBE_URL_REGEX.test(urlValue)
    setIsValidUrl(valid)
    setFetchError(null)
    setPreview(null)

    if (!valid) return

    const videoId = extractVideoId(urlValue)
    const fallbackTitle = `Vidéo YouTube (${videoId})`
    onYoutubeSelect(urlValue, fallbackTitle)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setIsFetching(true)
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(urlValue)}&format=json`,
        )
        if (!res.ok) throw new Error('not found')
        const data: OEmbedData = await res.json()
        setPreview(data)
        onYoutubeSelect(urlValue, data.title)
      } catch {
        setFetchError(
          'Aperçu indisponible — la vidéo sera quand même téléchargée',
        )
      } finally {
        setIsFetching(false)
      }
    }, 600)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [urlValue, onYoutubeSelect])

  const handleRemove = () => {
    setUrlValue('')
    setPreview(null)
    setIsValidUrl(null)
    setFetchError(null)
    onYoutubeRemove()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
        <Youtube className="h-4 w-4 text-red-500" />
        Lien YouTube
      </div>

      {!isYoutubeSource && (
        <Input
          placeholder="https://www.youtube.com/watch?v=..."
          value={urlValue}
          onChange={(e) => setUrlValue(e.target.value)}
          disabled={disabled}
          className={
            isValidUrl === false
              ? 'border-destructive focus-visible:ring-destructive'
              : ''
          }
        />
      )}

      {isValidUrl === false && (
        <p className="text-xs text-destructive">URL YouTube invalide</p>
      )}

      {fetchError && (
        <p className="text-xs text-muted-foreground">{fetchError}</p>
      )}

      {isFetching && <YoutubePreviewSkeleton />}

      {(preview || isValidUrl || isYoutubeSource) && !isFetching && (
        <YoutubePreviewCard
          thumbnailUrl={
            preview?.thumbnail_url ??
            `https://i.ytimg.com/vi/${extractVideoId(isYoutubeSource ? inputSource.url : urlValue)}/hqdefault.jpg`
          }
          title={
            preview?.title ??
            (isYoutubeSource ? inputSource.videoTitle : urlValue)
          }
          channelName={preview?.author_name ?? ''}
          onRemove={handleRemove}
        />
      )}
    </div>
  )
}

function extractVideoId(url: string): string {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/,
  )
  return match?.[1] ?? ''
}
