'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { readSession, writeSession } from '@/lib/transcription-session'
import type {
  JobResults,
  JobStatus,
} from '@/server/domains/transcription/transcription.types'

export function useJobSession(
  jobId: string,
  results: JobResults | null | undefined,
  status: JobStatus | null | undefined,
) {
  const [savedPartitionId, setSavedPartitionId] = useState<string | null>(null)
  const [jobTitle, setJobTitle] = useState<string | null>(null)

  useEffect(() => {
    const session = readSession()
    if (session?.jobId === jobId) {
      setSavedPartitionId(session.savedPartitionId ?? null)
      setJobTitle(session.title ?? null)
    }
  }, [jobId])

  useEffect(() => {
    if (results?.title) setJobTitle(results.title)
  }, [results])

  useEffect(() => {
    if (!status) return
    const session = readSession()
    if (session?.jobId === jobId) {
      writeSession({ ...session, status })
    }
  }, [status, jobId])

  const handleSaved = useCallback((partitionId: string) => {
    setSavedPartitionId(partitionId)
    const session = readSession()
    if (session) writeSession({ ...session, savedPartitionId: partitionId })
    toast.success('Partition sauvegardée !', {
      description: 'Retrouvez-la dans votre bibliothèque.',
      action: {
        label: 'Voir →',
        onClick: () => {
          window.location.href = '/dashboard/partitions'
        },
      },
      duration: 6000,
    })
  }, [])

  return {
    savedPartitionId,
    jobTitle,
    handleSaved,
  }
}
