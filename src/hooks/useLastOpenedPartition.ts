'use client'

import { useEffect, useState } from 'react'

import type { PartitionSummary } from '@/server/domains/partition'

type UseLastOpenedPartitionResult = {
  partition: PartitionSummary | null
  loading: boolean
}

export function useLastOpenedPartition(): UseLastOpenedPartitionResult {
  const [partition, setPartition] = useState<PartitionSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/partitions/last-opened')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPartition(data.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { partition, loading }
}
