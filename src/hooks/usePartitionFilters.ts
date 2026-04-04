'use client'

import { useMemo, useState } from 'react'

import type { PartitionSummary } from '@/server/domains/partition'

export type SortBy = 'date_desc' | 'date_asc' | 'title_asc'

export function usePartitionFilters(partitions: PartitionSummary[]) {
  const [search, setSearch] = useState('')
  const [instrumentFilter, setInstrumentFilter] = useState('all')
  const [sortBy, setSortBy] = useState<SortBy>('date_desc')

  const filtered = useMemo(() => {
    let list = [...partitions]

    if (search) {
      const q = search.toLowerCase()
      list = list.filter((p) => p.title.toLowerCase().includes(q))
    }

    if (instrumentFilter && instrumentFilter !== 'all') {
      list = list.filter((p) => p.instrument === instrumentFilter)
    }

    list.sort((a, b) => {
      if (sortBy === 'date_desc')
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === 'date_asc')
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return a.title.localeCompare(b.title)
    })

    return list
  }, [partitions, search, instrumentFilter, sortBy])

  return {
    search,
    setSearch,
    instrumentFilter,
    setInstrumentFilter,
    sortBy,
    setSortBy,
    filtered,
  }
}
