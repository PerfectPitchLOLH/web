'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { usePartitionFilters } from '@/hooks/usePartitionFilters'
import { usePartitions } from '@/hooks/usePartitions'
import type { PartitionSummary } from '@/server/domains/partition'

export function usePartitionsPage() {
  const router = useRouter()
  const { partitions, isLoading, deletePartition, updatePartition } =
    usePartitions()
  const {
    search,
    setSearch,
    instrumentFilter,
    setInstrumentFilter,
    sortBy,
    setSortBy,
    filtered,
  } = usePartitionFilters(partitions)

  const [deleteTarget, setDeleteTarget] = useState<PartitionSummary | null>(
    null,
  )

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deletePartition(deleteTarget.id)
      toast.success('Partition supprimée')
    } catch {
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeleteTarget(null)
    }
  }

  async function handleRename(id: string) {
    const partition = partitions.find((p) => p.id === id)
    if (!partition) return
    const newTitle = prompt('Nouveau nom :', partition.title)
    if (newTitle && newTitle.trim() && newTitle !== partition.title) {
      try {
        await updatePartition(id, { title: newTitle.trim() })
      } catch {
        toast.error('Erreur lors du renommage')
      }
    }
  }

  function handleView(id: string) {
    router.push(`/dashboard/partitions/${id}`)
  }

  function handleDeleteRequest(id: string) {
    const target = partitions.find((pt) => pt.id === id)
    if (target) setDeleteTarget(target)
  }

  return {
    partitions,
    isLoading,
    filtered,
    search,
    setSearch,
    instrumentFilter,
    setInstrumentFilter,
    sortBy,
    setSortBy,
    deleteTarget,
    setDeleteTarget,
    handleDelete,
    handleRename,
    handleView,
    handleDeleteRequest,
  }
}
