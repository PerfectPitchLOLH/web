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
}

const WS_BASE_URL = (
  process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/v1'
)
  .replace(/^https:\/\//, 'wss://')
  .replace(/^http:\/\//, 'ws://')

const BACKEND_STEP_MAP: Record<string, ProcessingStep> = {
  preprocessing: 'preprocessing',
  separating: 'separating',
  transcribing: 'transcribing',
  generating: 'generating',
  svg: 'generating',
  completed: 'completed',
}

function normalizeStep(raw: unknown): ProcessingStep | null {
  if (typeof raw !== 'string') return null
  return BACKEND_STEP_MAP[raw] ?? null
}

export function useJobProgress(jobId: string | null): UseJobProgressReturn {
  const [progress, setProgress] = useState<number>(0)
  const [step, setStep] = useState<ProcessingStep | null>(null)
  const [status, setStatus] = useState<JobStatus | null>(null)
  const [results, setResults] = useState<JobResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const statusRef = useRef<JobStatus | null>(null)

  const MAX_RECONNECT_ATTEMPTS = 3
  const RECONNECT_DELAY = 2000

  const fetchFinalStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/transcription/${id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          if (data.data.results) {
            setResults(data.data.results)
          }
          const finalStep = normalizeStep(data.data.current_step)
          if (finalStep !== null) setStep(finalStep)
          setStatus(data.data.status)
          statusRef.current = data.data.status
          setProgress(100)
        }
      }
    } catch (err) {
      console.error('Failed to fetch final status:', err)
    }
  }, [])

  const connectWebSocket = useCallback(
    (id: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return
      }

      try {
        console.log(
          '[useJobProgress] Attempting WebSocket connection:',
          `${WS_BASE_URL}/jobs/${id}/stream`,
        )
        const ws = new WebSocket(`${WS_BASE_URL}/jobs/${id}/stream`)
        wsRef.current = ws

        ws.onopen = () => {
          console.log('[useJobProgress] WebSocket connected!')
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
              fetchFinalStatus(id)
            }
          } catch (err) {
            console.error(
              '[useJobProgress] Failed to parse WebSocket message:',
              err,
            )
          }
        }

        ws.onerror = (err) => {
          console.error('[useJobProgress] WebSocket error:', err)
          setIsConnected(false)
          setError('Erreur de connexion WebSocket')
        }

        ws.onclose = () => {
          console.log('[useJobProgress] WebSocket closed')
          setIsConnected(false)

          if (
            statusRef.current !== 'completed' &&
            statusRef.current !== 'failed' &&
            reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
          ) {
            reconnectAttemptsRef.current += 1
            console.log(
              `[useJobProgress] Reconnecting attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`,
            )

            reconnectTimeoutRef.current = setTimeout(() => {
              connectWebSocket(id)
            }, RECONNECT_DELAY)
          }
        }
      } catch (err) {
        console.error('[useJobProgress] WebSocket creation failed:', err)
        setError('Impossible de créer la connexion WebSocket')
      }
    },
    [fetchFinalStatus],
  )

  useEffect(() => {
    if (!jobId) {
      return
    }

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
  }, [jobId, connectWebSocket])

  return {
    progress,
    step,
    status,
    results,
    error,
    isConnected,
  }
}
