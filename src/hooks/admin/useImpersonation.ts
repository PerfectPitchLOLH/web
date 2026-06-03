import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

type ImpersonationInfo = {
  sessionId: string
  targetUser: {
    id: string
    name: string
    email: string
    role: string
  }
  startedAt: string
}

export function useImpersonation() {
  const router = useRouter()
  const [activeImpersonation, setActiveImpersonation] =
    useState<ImpersonationInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchActiveImpersonation = useCallback(async () => {
    try {
      const response = await fetch('/api/impersonation/active')
      const data = await response.json()

      if (data.success && data.data.impersonation) {
        setActiveImpersonation(data.data.impersonation)
      } else {
        setActiveImpersonation(null)
      }
    } catch {
      setActiveImpersonation(null)
    }
  }, [])

  useEffect(() => {
    fetchActiveImpersonation()
  }, [fetchActiveImpersonation])

  const startImpersonation = useCallback(async (targetUserId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/impersonation/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to start impersonation')
      }

      if (data.success) {
        window.location.replace('/dashboard')
        return true
      }

      return false
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to start impersonation'
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const endImpersonation = useCallback(async () => {
    if (!activeImpersonation) return false

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/impersonation/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: activeImpersonation.sessionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to end impersonation')
      }

      if (data.success) {
        setActiveImpersonation(null)
        router.push('/admin/users')
        router.refresh()
        return true
      }

      return false
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to end impersonation'
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [activeImpersonation, router])

  return {
    activeImpersonation,
    isLoading,
    error,
    startImpersonation,
    endImpersonation,
    refetch: fetchActiveImpersonation,
  }
}
