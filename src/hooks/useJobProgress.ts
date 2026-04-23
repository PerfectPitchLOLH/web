'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  JobResults,
  JobStatus,
  ProcessingStep,
  ProgressUpdate,
} from '@/server/domains/transcription'

interface UseJobProgressReturn {
  progress: number
  step: ProcessingStep | null
  status: JobStatus | null
  results: JobResults | null
  error: string | null
  isConnected: boolean
  isInitialLoading: boolean
}

const WS_BASE_URL = (
  process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/v1'
)
  .replace(/^https:\/\//, 'wss://')
  .replace(/^http:\/\//, 'ws://')

const VALID_STEPS = new Set<ProcessingStep>([
  'preprocessing',
  'separation',
  'transcription',
  'musicxml',
  'score',
  'svg',
])

function normalizeStep(raw: unknown): ProcessingStep | null {
  if (typeof raw !== 'string') return null
  return VALID_STEPS.has(raw as ProcessingStep) ? (raw as ProcessingStep) : null
}

export function useJobProgress(jobId: string | null): UseJobProgressReturn {
  const [progress, setProgress] = useState<number>(0)
  const [step, setStep] = useState<ProcessingStep | null>(null)
  const [status, setStatus] = useState<JobStatus | null>(null)
  const [results, setResults] = useState<JobResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const statusRef = useRef<JobStatus | null>(null)

  const MAX_RECONNECT_ATTEMPTS = 3
  const RECONNECT_DELAY = 2000

  const fetchCurrentStatus = useCallback(async (id: string) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch(`/api/transcription/${id}`, {
        signal: controller.signal,
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          const job = data.data
          if (job.results) setResults(job.results)
          const currentStep = normalizeStep(job.current_step)
          if (currentStep !== null) setStep(currentStep)
          setStatus(job.status)
          statusRef.current = job.status
          setProgress(job.status === 'completed' ? 100 : (job.progress ?? 0))
          if (job.error) setError(job.error)
          if (job.status === 'completed') {
            window.dispatchEvent(new Event('credits-refresh'))
          }
        }
      }
    } catch {
    } finally {
      clearTimeout(timeoutId)
      setIsInitialLoading(false)
    }
  }, [])

  const connectWebSocket = useCallback(
    (id: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return
      }

      try {
        const ws = new WebSocket(`${WS_BASE_URL}/jobs/${id}/stream`)
        wsRef.current = ws

        ws.onopen = () => {
          setIsConnected(true)
          reconnectAttemptsRef.current = 0
        }

        ws.onmessage = (event) => {
          try {
            const data: ProgressUpdate = JSON.parse(event.data)

            const rawStep = data.current_step ?? data.step
            const normalized = normalizeStep(rawStep)

            setProgress(data.progress)
            if (normalized !== null) setStep(normalized)
            setStatus(data.status)
            statusRef.current = data.status

            if (data.error) {
              setError(data.error)
            }

            if (data.status === 'completed' || data.status === 'failed') {
              fetchCurrentStatus(id)
            }
          } catch (err) {
            console.error(
              '[useJobProgress] Failed to parse WebSocket message:',
              err,
            )
          }
        }

        ws.onerror = () => {
          setIsConnected(false)
        }

        ws.onclose = () => {
          setIsConnected(false)

          if (
            statusRef.current !== 'completed' &&
            statusRef.current !== 'failed'
          ) {
            if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
              reconnectAttemptsRef.current += 1
              reconnectTimeoutRef.current = setTimeout(() => {
                connectWebSocket(id)
              }, RECONNECT_DELAY)
            } else {
              fetchCurrentStatus(id)
            }
          }
        }
      } catch {
        fetchCurrentStatus(id)
      }
    },
    [fetchCurrentStatus],
  )

  useEffect(() => {
    if (!jobId) {
      return
    }

    setIsInitialLoading(true)
    fetchCurrentStatus(jobId)
    connectWebSocket(jobId)

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [jobId, connectWebSocket, fetchCurrentStatus])

  return {
    progress,
    step,
    status,
    results,
    error,
    isConnected,
    isInitialLoading,
  }
}
