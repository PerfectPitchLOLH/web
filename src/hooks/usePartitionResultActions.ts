'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'

export function usePartitionResultActions(
  partitionId: string | null,
  onDeleted: () => void,
) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const renamePartition = useCallback(
    async (title: string): Promise<boolean> => {
      const trimmed = title.trim()
      if (!partitionId || !trimmed) return false
      setIsRenaming(true)
      try {
        const res = await fetch(`/api/partitions/${partitionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: trimmed.slice(0, 120) }),
        })
        if (!res.ok) throw new Error()
        return true
      } catch {
        toast.error('Impossible de renommer la partition')
        return false
      } finally {
        setIsRenaming(false)
      }
    },
    [partitionId],
  )

  const deletePartition = useCallback(async () => {
    if (!partitionId) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/partitions/${partitionId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      onDeleted()
    } catch {
      toast.error('Impossible de supprimer la partition')
      setIsDeleting(false)
    }
  }, [partitionId, onDeleted])

  return { isRenaming, isDeleting, renamePartition, deletePartition }
}
