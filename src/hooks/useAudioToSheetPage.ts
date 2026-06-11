'use client'

import { useCallback, useRef, useState } from 'react'

import {
  getFormatAvailability,
  POLYPHONIC_DEFAULTS,
} from '@/components/audio-to-sheet/audio-to-sheet.constants'
import { useCredits } from '@/hooks/useCredits'
import { useTranscribeSubmit } from '@/hooks/useTranscribeSubmit'
import { useTranscription } from '@/hooks/useTranscription'
import type { DetectedUrlType } from '@/hooks/useUnifiedUrlInput'
import type {
  InputSource,
  InstrumentMode,
  InstrumentType,
  PartitionType,
  TranscribeConfig,
} from '@/server/domains/transcription/transcription.types'

const DEFAULT_CONFIG: TranscribeConfig = {
  instrument_mode: 'single',
  instrument_type: 'piano',
  polyphonic: true,
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
  const remainingSeconds = credits?.remainingCredits ?? null
  const outOfCredits = remainingSeconds !== null && remainingSeconds <= 0

  const [inputSource, setInputSource] = useState<InputSource>(null)
  const [config, setConfig] = useState<TranscribeConfig>(DEFAULT_CONFIG)
  const separationTouched = useRef(false)
  const polyphonicTouched = useRef(false)

  const applySmartMode = useCallback((source: InputSource) => {
    if (separationTouched.current) return
    const mode: InstrumentMode =
      source?.type === 'youtube' || source?.type === 'spotify'
        ? 'multiple'
        : 'single'
    setConfig((c) => ({
      ...c,
      instrument_mode: mode,
      partition_type: getFormatAvailability(
        c.partition_type,
        c.instrument_type,
        mode,
      ).available
        ? c.partition_type
        : 'classique',
    }))
  }, [])

  const handleFileSelect = useCallback(
    (file: File, durationSeconds?: number) => {
      const source: InputSource = { type: 'file', file, durationSeconds }
      setInputSource(source)
      applySmartMode(source)
    },
    [applySmartMode],
  )

  const handleUrlSelect = useCallback(
    (type: DetectedUrlType, url: string, title: string) => {
      const source: InputSource =
        type === 'youtube'
          ? { type: 'youtube', url, videoTitle: title }
          : { type: 'spotify', url, trackTitle: title }
      setInputSource(source)
      applySmartMode(source)
    },
    [applySmartMode],
  )

  const handleSourceRemove = useCallback(() => {
    setInputSource(null)
  }, [])

  const handleInstrumentChange = useCallback((instrument: InstrumentType) => {
    setConfig((c) => ({
      ...c,
      instrument_type: instrument,
      partition_type: getFormatAvailability(
        c.partition_type,
        instrument,
        c.instrument_mode,
      ).available
        ? c.partition_type
        : 'classique',
      polyphonic: polyphonicTouched.current
        ? c.polyphonic
        : POLYPHONIC_DEFAULTS[instrument],
    }))
  }, [])

  const handleFormatChange = useCallback((format: PartitionType) => {
    setConfig((c) =>
      getFormatAvailability(format, c.instrument_type, c.instrument_mode)
        .available
        ? { ...c, partition_type: format }
        : c,
    )
  }, [])

  const handleSeparationChange = useCallback((checked: boolean) => {
    separationTouched.current = true
    const mode: InstrumentMode = checked ? 'multiple' : 'single'
    setConfig((c) => ({
      ...c,
      instrument_mode: mode,
      partition_type: getFormatAvailability(
        c.partition_type,
        c.instrument_type,
        mode,
      ).available
        ? c.partition_type
        : 'classique',
    }))
  }, [])

  const handlePolyphonicChange = useCallback((checked: boolean) => {
    polyphonicTouched.current = true
    setConfig((c) => ({ ...c, polyphonic: checked }))
  }, [])

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

  const costSeconds =
    inputSource?.type === 'file' ? (inputSource.durationSeconds ?? null) : null
  const insufficientCredits =
    !outOfCredits &&
    costSeconds !== null &&
    remainingSeconds !== null &&
    costSeconds > remainingSeconds

  return {
    inputSource,
    config,
    outOfCredits,
    insufficientCredits,
    costSeconds,
    remainingSeconds,
    sessionToResume,
    error,
    reset,
    isSubmitting,
    handleTranscribe,
    similarPartitions,
    similarDialogOpen,
    setSimilarDialogOpen,
    handleSimilarConfirm,
    handleFileSelect,
    handleUrlSelect,
    handleSourceRemove,
    handleInstrumentChange,
    handleFormatChange,
    handleSeparationChange,
    handlePolyphonicChange,
  }
}
