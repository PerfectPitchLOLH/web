'use client'

import { useEffect, useRef, useState } from 'react'

import { readSession } from '@/lib/transcription-session'
import type {
  JobResults,
  JobStatus,
} from '@/server/domains/transcription/transcription.types'

type Params = {
  jobId: string
  status: JobStatus | null
  results: JobResults | null
  title: string
  savedPartitionId: string | null
  onSaved: (partitionId: string) => void
}

export function useAutoSavePartition({
  jobId,
  status,
  results,
  title,
  savedPartitionId,
  onSaved,
}: Params) {
  const attemptedRef = useRef(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [autoSaveFailed, setAutoSaveFailed] = useState(false)

  useEffect(() => {
    if (
      status !== 'completed' ||
      !results ||
      savedPartitionId ||
      attemptedRef.current
    ) {
      return
    }
    const session = readSession()
    if (session?.jobId === jobId && session.savedPartitionId) return

    attemptedRef.current = true
    setIsAutoSaving(true)
    fetch('/api/partitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, title: title.slice(0, 120) }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (
          res.status === 409 &&
          data.error?.code === 'PARTITION_ALREADY_SAVED'
        ) {
          const existingId = data.error?.details?.id
          if (existingId) {
            onSaved(existingId)
            return
          }
        }
        if (!res.ok) throw new Error()
        onSaved(data.data.id)
      })
      .catch(() => setAutoSaveFailed(true))
      .finally(() => setIsAutoSaving(false))
  }, [status, results, savedPartitionId, jobId, title, onSaved])

  return { isAutoSaving, autoSaveFailed }
}
