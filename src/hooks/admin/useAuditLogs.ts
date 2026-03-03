import { useEffect, useState } from 'react'

import type { AuditLogResult } from '@/server/domains/admin'

export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLogResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`)

      if (!res.ok) {
        throw new Error('Failed to fetch audit logs')
      }

      const data = await res.json()
      setLogs(data.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  return {
    logs,
    loading,
    error,
    page,
    setPage,
    refetchLogs: fetchLogs,
  }
}
