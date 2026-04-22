'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'

import { INSTRUMENT_TO_STEM } from '@/components/audio-to-sheet/audio-to-sheet.constants'
import type {
  InputSource,
  TranscribeConfig,
} from '@/server/domains/transcription/transcription.types'

type TranscribeFns = {
  transcribe: (
    file: File,
    config: TranscribeConfig,
    duration: number,
  ) => Promise<string | null>
  transcribeFromYoutube: (
    url: string,
    title: string,
    config: TranscribeConfig,
  ) => Promise<string | null>
  transcribeFromSpotify: (
    url: string,
    title: string,
    config: TranscribeConfig,
  ) => Promise<string | null>
}

export function useTranscribeSubmit(
  inputSource: InputSource,
  config: TranscribeConfig,
  fns: TranscribeFns,
) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [similarPartitions, setSimilarPartitions] = useState<
    { id: string; title: string }[]
  >([])
  const [similarDialogOpen, setSimilarDialogOpen] = useState(false)
  const pendingTranscribe = useRef<(() => Promise<void>) | null>(null)

  const doTranscribe = useCallback(async () => {
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
        jobId = await fns.transcribe(
          inputSource.file,
          configToSend,
          inputSource.durationSeconds ?? 0,
        )
      } else if (inputSource.type === 'youtube') {
        jobId = await fns.transcribeFromYoutube(
          inputSource.url,
          inputSource.videoTitle,
          configToSend,
        )
      } else if (inputSource.type === 'spotify') {
        jobId = await fns.transcribeFromSpotify(
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
  }, [inputSource, config, fns, router])

  const handleTranscribe = async () => {
    if (!inputSource) return

    let title = ''
    if (inputSource.type === 'file')
      title = inputSource.file.name.replace(/\.[^/.]+$/, '')
    else if (inputSource.type === 'youtube') title = inputSource.videoTitle
    else if (inputSource.type === 'spotify') title = inputSource.trackTitle

    if (title.trim().length >= 3) {
      try {
        const res = await fetch(
          `/api/partitions?similar=true&title=${encodeURIComponent(title.trim())}`,
        )
        if (res.ok) {
          const data = await res.json()
          const matches: { id: string; title: string }[] = data.data ?? []
          if (matches.length > 0) {
            setSimilarPartitions(matches)
            pendingTranscribe.current = doTranscribe
            setSimilarDialogOpen(true)
            return
          }
        }
      } catch {}
    }

    await doTranscribe()
  }

  const handleSimilarConfirm = () => {
    setSimilarDialogOpen(false)
    pendingTranscribe.current?.()
  }

  return {
    isSubmitting,
    handleTranscribe,
    similarPartitions,
    similarDialogOpen,
    setSimilarDialogOpen,
    handleSimilarConfirm,
  }
}
