'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAnalytics } from '@/hooks/useAnalytics'
import {
  clearSession,
  readSession,
  type TranscriptionSession,
  writeSession,
} from '@/lib/transcription-session'
import type {
  JobResults,
  JobStatus,
  ProcessingStep,
  TranscribeConfig,
} from '@/server/domains/transcription'

import { useJobProgress } from './useJobProgress'

interface UseTranscriptionReturn {
  transcribe: (
    file: File,
    config: TranscribeConfig,
    durationSeconds?: number,
  ) => Promise<string | null>
  transcribeFromYoutube: (
    url: string,
    videoTitle: string,
    config: TranscribeConfig,
  ) => Promise<string | null>
  transcribeFromSpotify: (
    url: string,
    trackTitle: string,
    config: TranscribeConfig,
  ) => Promise<string | null>
  resumeSession: () => void
  cancel: () => Promise<void>
  jobId: string | null
  jobTitle: string | null
  status: JobStatus | null
  progress: number
  currentStep: ProcessingStep | null
  results: JobResults | null
  error: string | null
  isProcessing: boolean
  isCancelling: boolean
  sessionToResume: TranscriptionSession | null
  reset: () => void
}

export function useTranscription(): UseTranscriptionReturn {
  const { track } = useAnalytics()
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobTitle, setJobTitle] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [sessionToResume, setSessionToResume] =
    useState<TranscriptionSession | null>(null)
  const jobIdRef = useRef<string | null>(null)
  const sourceRef = useRef<'file' | 'youtube' | 'spotify' | null>(null)
  const completedJobIdRef = useRef<string | null>(null)

  useEffect(() => {
    jobIdRef.current = jobId
  }, [jobId])

  const {
    progress,
    step: currentStep,
    status,
    error: wsError,
    results,
  } = useJobProgress(jobId)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = readSession()
      if (!session) return
      setSessionToResume(session)
      fetch(`/api/transcription/${session.jobId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.success && data?.data?.status) {
            const realStatus = data.data.status
            if (realStatus !== session.status) {
              const updated = { ...session, status: realStatus }
              writeSession(updated)
              setSessionToResume(updated)
            }
          }
        })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (wsError) {
      setError(wsError)
    }
  }, [wsError])

  useEffect(() => {
    if (jobId && status) {
      const session = readSession()
      if (session && session.jobId === jobId) {
        writeSession({ ...session, status })
      }
    }
  }, [status, jobId])

  useEffect(() => {
    if (results?.title) {
      setJobTitle(results.title)
    }
  }, [results])

  useEffect(() => {
    if (
      jobId &&
      status === 'completed' &&
      completedJobIdRef.current !== jobId
    ) {
      completedJobIdRef.current = jobId
      track({
        name: 'transcription_completed',
        properties: { source: sourceRef.current ?? 'file' },
      })
    }
  }, [status, jobId, track])

  const transcribe = useCallback(
    async (file: File, config: TranscribeConfig, durationSeconds?: number) => {
      try {
        setError(null)
        setSessionToResume(null)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('config', JSON.stringify(config))
        if (durationSeconds !== undefined && isFinite(durationSeconds)) {
          formData.append('duration_seconds', durationSeconds.toString())
        }

        const response = await fetch('/api/transcription', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          const errorMessage =
            typeof errorData.error === 'string'
              ? errorData.error
              : errorData.error?.message || 'Upload failed'
          throw new Error(errorMessage)
        }

        const data = await response.json()

        if (data.success && data.data) {
          const newJobId = data.data.job_id
          setJobId(newJobId)
          sourceRef.current = 'file'
          track({
            name: 'transcription_started',
            properties: { source: 'file' },
          })

          if (typeof window !== 'undefined') {
            const title = file.name.replace(/\.[^/.]+$/, '')
            setJobTitle(title)
            writeSession({
              jobId: newJobId,
              timestamp: Date.now(),
              status: 'queued',
              title,
            })
          }
          return newJobId
        } else {
          throw new Error(data.error || 'Invalid response from server')
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An error occurred'
        setError(errorMessage)
      }
      return null
    },
    [track],
  )

  const transcribeFromYoutube = useCallback(
    async (url: string, videoTitle: string, config: TranscribeConfig) => {
      try {
        setError(null)
        setSessionToResume(null)

        const response = await fetch('/api/transcription/youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, config }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          const errorMessage =
            typeof errorData.error === 'string'
              ? errorData.error
              : errorData.error?.message || 'Upload failed'
          throw new Error(errorMessage)
        }

        const data = await response.json()

        if (data.success && data.data) {
          const newJobId = data.data.job_id
          setJobId(newJobId)
          sourceRef.current = 'youtube'
          track({
            name: 'transcription_started',
            properties: { source: 'youtube' },
          })

          if (typeof window !== 'undefined') {
            const title = videoTitle
            setJobTitle(title)
            writeSession({
              jobId: newJobId,
              timestamp: Date.now(),
              status: 'queued',
              title,
            })
          }
          return newJobId
        } else {
          throw new Error(data.error || 'Invalid response from server')
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An error occurred'
        setError(errorMessage)
      }
      return null
    },
    [track],
  )

  const transcribeFromSpotify = useCallback(
    async (url: string, trackTitle: string, config: TranscribeConfig) => {
      try {
        setError(null)
        setSessionToResume(null)

        const response = await fetch('/api/transcription/spotify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, config }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          const errorMessage =
            typeof errorData.error === 'string'
              ? errorData.error
              : errorData.error?.message || 'Upload failed'
          throw new Error(errorMessage)
        }

        const data = await response.json()

        if (data.success && data.data) {
          const newJobId = data.data.job_id
          setJobId(newJobId)
          sourceRef.current = 'spotify'
          track({
            name: 'transcription_started',
            properties: { source: 'spotify' },
          })

          if (typeof window !== 'undefined') {
            setJobTitle(trackTitle)
            writeSession({
              jobId: newJobId,
              timestamp: Date.now(),
              status: 'queued',
              title: trackTitle,
            })
          }
          return newJobId
        } else {
          throw new Error(data.error || 'Invalid response from server')
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An error occurred'
        setError(errorMessage)
      }
      return null
    },
    [track],
  )

  const resumeSession = useCallback(() => {
    const session = readSession()
    if (session) {
      setJobId(session.jobId)
      setJobTitle(session.title ?? null)
      setSessionToResume(null)
    }
  }, [])

  const reset = useCallback(() => {
    setJobId(null)
    setJobTitle(null)
    setError(null)
    setSessionToResume(null)
    sourceRef.current = null
    completedJobIdRef.current = null
    clearSession()
  }, [])

  const cancel = useCallback(async () => {
    const currentJobId = jobIdRef.current
    if (!currentJobId) return
    setIsCancelling(true)
    try {
      await fetch(`/api/transcription/${currentJobId}`, { method: 'DELETE' })
    } catch {
      // Réinitialise localement même si le backend échoue
    } finally {
      setIsCancelling(false)
      reset()
    }
  }, [reset])

  const isProcessing = status === 'queued' || status === 'processing'

  return {
    transcribe,
    transcribeFromYoutube,
    transcribeFromSpotify,
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
  }
}
