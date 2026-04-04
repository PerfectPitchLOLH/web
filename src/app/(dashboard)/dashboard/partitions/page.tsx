'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { LibraryFilterBar } from '@/components/partitions/LibraryFilterBar'
import { PartitionCard } from '@/components/partitions/PartitionCard'
import { PartitionDeleteDialog } from '@/components/partitions/PartitionDeleteDialog'
import { PartitionEmptyState } from '@/components/partitions/PartitionEmptyState'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { usePartitionFilters } from '@/hooks/usePartitionFilters'
import { usePartitions } from '@/hooks/usePartitions'
import type { PartitionSummary } from '@/server/domains/partition'

export default function PartitionsPage() {
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

  const handleDelete = async () => {
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

  const handleRename = async (id: string) => {
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

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Ma Bibliothèque</h1>
          <Badge variant="secondary">
            {partitions.length}{' '}
            {partitions.length === 1 ? 'partition' : 'partitions'}
          </Badge>
        </div>
      </div>

      <LibraryFilterBar
        search={search}
        onSearchChange={setSearch}
        instrumentFilter={instrumentFilter}
        onInstrumentFilterChange={setInstrumentFilter}
        sortBy={sortBy}
        onSortChange={(v) =>
          setSortBy(v as 'date_desc' | 'date_asc' | 'title_asc')
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 && partitions.length === 0 ? (
        <PartitionEmptyState />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p>Aucune partition ne correspond à votre recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p, i) => (
            <PartitionCard
              key={p.id}
              id={p.id}
              title={p.title}
              instrument={p.instrument}
              partitionType={p.partitionType}
              tags={p.tags}
              createdAt={p.createdAt}
              durationSeconds={p.durationSeconds}
              onView={(id) => router.push(`/dashboard/partitions/${id}`)}
              onRename={handleRename}
              onDelete={(id) => {
                const target = partitions.find((pt) => pt.id === id)
                if (target) setDeleteTarget(target)
              }}
              style={{ animationDelay: `${i * 50}ms` }}
              className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 [fill-mode:both]"
            />
          ))}
        </div>
      )}

      {deleteTarget && (
        <PartitionDeleteDialog
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null)
          }}
          title={deleteTarget.title}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
