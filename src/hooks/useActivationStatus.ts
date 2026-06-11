'use client'

import { useCallback, useEffect, useState } from 'react'

import type { ActivationStatus } from '@/server/domains/user'

type UseActivationStatusResult = {
  status: ActivationStatus | null
  loading: boolean
  dismiss: () => Promise<void>
}

export function useActivationStatus(): UseActivationStatusResult {
  const [status, setStatus] = useState<ActivationStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/users/activation-status')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStatus(data.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const dismiss = useCallback(async () => {
    setStatus((prev) => (prev ? { ...prev, dismissed: true } : prev))
    await fetch('/api/users/activation-status/dismiss', {
      method: 'POST',
    }).catch(() => {})
  }, [])

  return { status, loading, dismiss }
}
