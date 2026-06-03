'use client'

import { useCallback, useState } from 'react'

import { useCredits } from '@/hooks/useCredits'
import { useTranscribeSubmit } from '@/hooks/useTranscribeSubmit'
import { useTranscription } from '@/hooks/useTranscription'
import type {
  InputSource,
  TranscribeConfig,
} from '@/server/domains/transcription/transcription.types'

type UrlTab = 'youtube' | 'spotify'

const DEFAULT_CONFIG: TranscribeConfig = {
  instrument_mode: 'single',
  instrument_type: 'piano',
  polyphonic: false,
  partition_type: 'classique',
}

export function useAudioToSheetPage() {
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

  function handleTabChange(tab: UrlTab) {
    setUrlTab(tab)
    setInputSource(null)
  }

  return {
    inputSource,
    setInputSource,
    config,
    setConfig,
    urlTab,
    outOfCredits,
    sessionToResume,
    error,
    reset,
    isSubmitting,
    handleTranscribe,
    similarPartitions,
    similarDialogOpen,
    setSimilarDialogOpen,
    handleSimilarConfirm,
    handleYoutubeSelect,
    handleYoutubeRemove,
    handleSpotifySelect,
    handleSpotifyRemove,
    handleTabChange,
  }
}
