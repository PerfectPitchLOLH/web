'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

import { clearSession } from '@/lib/transcription-session'

export function useJobActions(jobId: string) {
  const router = useRouter()
  const [isCancelling, setIsCancelling] = useState(false)

  const handleCancel = useCallback(async () => {
    setIsCancelling(true)
    try {
      fetch(`/api/transcription/${jobId}`, { method: 'DELETE' })
    } finally {
      clearSession()
      router.push('/dashboard/audio-to-sheet')
    }
  }, [jobId, router])

  const handleReset = useCallback(() => {
    clearSession()
    router.push('/dashboard/audio-to-sheet')
  }, [router])

  return { isCancelling, handleCancel, handleReset }
}
