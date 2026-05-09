'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { JobStatus } from '@/server/domains/transcription'

type JobResponse = {
  job_id: string
  status: JobStatus
  progress?: number
  result_url?: string
  error?: string
}

export function useJobPolling(jobId: string | null, enabled = true) {
  const [status, setStatus] = useState<JobStatus>('queued')
  const [progress, setProgress] = useState(0)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)

  const pollJobStatus = useCallback(async () => {
    if (!jobId) return

    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      const response = await fetch(`${backendUrl}/jobs/${jobId}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: JobResponse = await response.json()

      setStatus(data.status)
      setProgress(data.progress || 0)

      if (data.result_url) {
        setResultUrl(data.result_url)
      }

      if (data.error) {
        setError(data.error)
      }

      if (data.status === 'completed' || data.status === 'failed') {
        setIsPolling(false)
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
      }

      retryCountRef.current = 0
    } catch {
      retryCountRef.current++

      if (retryCountRef.current >= 5) {
        setError('Failed to check job status after multiple attempts')
        setIsPolling(false)
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
      }
    }
  }, [jobId])

  useEffect(() => {
    if (!jobId || !enabled) {
      setIsPolling(false)
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      return
    }

    setIsPolling(true)
    pollJobStatus()

    pollingIntervalRef.current = setInterval(() => {
      pollJobStatus()
    }, 2000)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [jobId, enabled, pollJobStatus])

  const reset = useCallback(() => {
    setStatus('queued')
    setProgress(0)
    setResultUrl(null)
    setError(null)
    setIsPolling(false)
    retryCountRef.current = 0

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [])

  return {
    status,
    progress,
    resultUrl,
    error,
    isPolling,
    reset,
  }
}
