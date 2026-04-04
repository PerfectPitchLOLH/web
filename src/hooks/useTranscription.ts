'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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
  transcribe: (file: File, config: TranscribeConfig) => Promise<void>
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
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobTitle, setJobTitle] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [sessionToResume, setSessionToResume] =
    useState<TranscriptionSession | null>(null)
  const jobIdRef = useRef<string | null>(null)

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
      if (session) {
        setSessionToResume(session)
      }
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

  const transcribe = useCallback(
    async (file: File, config: TranscribeConfig) => {
      try {
        setError(null)
        setSessionToResume(null)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('config', JSON.stringify(config))

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
        } else {
          throw new Error(data.error || 'Invalid response from server')
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An error occurred'
        setError(errorMessage)
      }
    },
    [],
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
