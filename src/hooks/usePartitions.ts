'use client'

import { useCallback, useEffect, useState } from 'react'

import type { PartitionSummary } from '@/server/domains/partition'

interface UsePartitionsReturn {
  partitions: PartitionSummary[]
  isLoading: boolean
  error: string | null
  refetch: () => void
  deletePartition: (id: string) => Promise<void>
  updatePartition: (
    id: string,
    data: { title?: string; tags?: string[]; notes?: string },
  ) => Promise<void>
}

export function usePartitions(): UsePartitionsReturn {
  const [partitions, setPartitions] = useState<PartitionSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPartitions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/partitions')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Erreur')
      setPartitions(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPartitions()
  }, [fetchPartitions])

  const deletePartition = useCallback(
    async (id: string) => {
      setPartitions((prev) => prev.filter((p) => p.id !== id))
      const res = await fetch(`/api/partitions/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        fetchPartitions()
        throw new Error('Erreur lors de la suppression')
      }
    },
    [fetchPartitions],
  )

  const updatePartition = useCallback(
    async (
      id: string,
      data: { title?: string; tags?: string[]; notes?: string },
    ) => {
      const res = await fetch(`/api/partitions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message || 'Erreur')
      setPartitions((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...json.data } : p)),
      )
    },
    [],
  )

  return {
    partitions,
    isLoading,
    error,
    refetch: fetchPartitions,
    deletePartition,
    updatePartition,
  }
}
