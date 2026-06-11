'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { InputSource } from '@/server/domains/transcription/transcription.types'
import {
  SPOTIFY_URL_REGEX,
  YOUTUBE_URL_REGEX,
} from '@/server/domains/transcription/transcription.types'

export type DetectedUrlType = 'youtube' | 'spotify'

export type OEmbedPreview = {
  title: string
  author_name: string
  thumbnail_url: string
}

export function extractYoutubeVideoId(url: string): string {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/,
  )
  return match?.[1] ?? ''
}

function detectUrlType(url: string): DetectedUrlType | null {
  if (YOUTUBE_URL_REGEX.test(url)) return 'youtube'
  if (SPOTIFY_URL_REGEX.test(url)) return 'spotify'
  return null
}

export function useUnifiedUrlInput(
  inputSource: InputSource,
  onUrlSelect: (type: DetectedUrlType, url: string, title: string) => void,
  onUrlRemove: () => void,
) {
  const [urlValue, setUrlValue] = useState('')
  const [isInvalid, setIsInvalid] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [preview, setPreview] = useState<OEmbedPreview | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!urlValue) {
      setIsInvalid(false)
      setFetchError(null)
      setPreview(null)
      return
    }

    const type = detectUrlType(urlValue)
    setIsInvalid(!type)
    setFetchError(null)
    setPreview(null)

    if (!type) return

    const fallbackTitle =
      type === 'youtube'
        ? `Vidéo YouTube (${extractYoutubeVideoId(urlValue)})`
        : 'Titre Spotify'
    onUrlSelect(type, urlValue, fallbackTitle)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setIsFetching(true)
      try {
        const res = await fetch(
          `/api/${type}/oembed?url=${encodeURIComponent(urlValue)}`,
        )
        if (!res.ok) throw new Error('not found')
        const data: OEmbedPreview = await res.json()
        setPreview(data)
        onUrlSelect(type, urlValue, data.title)
      } catch {
        setFetchError(
          'Aperçu indisponible — l’audio sera quand même téléchargé',
        )
      } finally {
        setIsFetching(false)
      }
    }, 600)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [urlValue, onUrlSelect])

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      if (inputSource) return
      const text = e.clipboardData?.getData('text')?.trim()
      if (text && detectUrlType(text)) setUrlValue(text)
    }
    window.addEventListener('paste', handler)
    return () => window.removeEventListener('paste', handler)
  }, [inputSource])

  const clear = useCallback(() => {
    setUrlValue('')
    setPreview(null)
    setIsInvalid(false)
    setFetchError(null)
    onUrlRemove()
  }, [onUrlRemove])

  return {
    urlValue,
    setUrlValue,
    isInvalid,
    isFetching,
    fetchError,
    preview,
    clear,
  }
}
