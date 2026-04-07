'use client'

import { Music } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { InputSource } from '@/server/domains/transcription/transcription.types'
import { SPOTIFY_URL_REGEX } from '@/server/domains/transcription/transcription.types'

import { SpotifyPreviewCard } from './SpotifyPreviewCard'

interface SpotifyInputProps {
  inputSource: InputSource
  onSpotifySelect: (url: string, trackTitle: string) => void
  onSpotifyRemove: () => void
  disabled?: boolean
}

interface OEmbedData {
  title: string
  author_name: string
  thumbnail_url: string
}

function SpotifyPreviewSkeleton() {
  return (
    <div className="flex gap-3 rounded-lg border bg-muted/40 p-3 items-start">
      <Skeleton className="shrink-0 w-14 h-14 rounded" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

export function SpotifyInput({
  inputSource,
  onSpotifySelect,
  onSpotifyRemove,
  disabled,
}: SpotifyInputProps) {
  const [urlValue, setUrlValue] = useState('')
  const [isValidUrl, setIsValidUrl] = useState<boolean | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [preview, setPreview] = useState<OEmbedData | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isSpotifySource = inputSource?.type === 'spotify'

  useEffect(() => {
    if (!urlValue) {
      setIsValidUrl(null)
      setFetchError(null)
      setPreview(null)
      return
    }

    const valid = SPOTIFY_URL_REGEX.test(urlValue)
    setIsValidUrl(valid)
    setFetchError(null)
    setPreview(null)

    if (!valid) return

    const fallbackTitle = 'Titre Spotify'
    onSpotifySelect(urlValue, fallbackTitle)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setIsFetching(true)
      try {
        const res = await fetch(
          `/api/spotify/oembed?url=${encodeURIComponent(urlValue)}`,
        )
        if (!res.ok) throw new Error('not found')
        const data: OEmbedData = await res.json()
        setPreview(data)
        onSpotifySelect(urlValue, data.title)
      } catch {
        setFetchError(
          'Aperçu indisponible — le titre sera quand même téléchargé',
        )
      } finally {
        setIsFetching(false)
      }
    }, 600)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [urlValue, onSpotifySelect])

  const handleRemove = () => {
    setUrlValue('')
    setPreview(null)
    setIsValidUrl(null)
    setFetchError(null)
    onSpotifyRemove()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
        <Music className="h-4 w-4 text-green-500" />
        Lien Spotify
      </div>

      {!isSpotifySource && (
        <Input
          placeholder="https://open.spotify.com/track/..."
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
        <p className="text-xs text-destructive">
          URL Spotify invalide (lien de morceau uniquement)
        </p>
      )}

      {fetchError && (
        <p className="text-xs text-muted-foreground">{fetchError}</p>
      )}

      {isFetching && <SpotifyPreviewSkeleton />}

      {(preview || isValidUrl || isSpotifySource) && !isFetching && (
        <SpotifyPreviewCard
          thumbnailUrl={preview?.thumbnail_url ?? ''}
          title={
            preview?.title ??
            (isSpotifySource ? inputSource.trackTitle : urlValue)
          }
          artistName={preview?.author_name ?? ''}
          onRemove={handleRemove}
        />
      )}
    </div>
  )
}
