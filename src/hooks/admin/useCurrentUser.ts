import { useEffect, useState } from 'react'

export type CurrentUser = {
  id: string
  email: string
  name: string
  role: string
  isRootAdmin: boolean
}

export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCurrentUser = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/me')
      if (!res.ok) {
        throw new Error('Failed to fetch current user')
      }
      const data = await res.json()
      setCurrentUser(data.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      console.error('Error fetching current user:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  return {
    currentUser,
    loading,
    error,
    refetch: fetchCurrentUser,
  }
}
