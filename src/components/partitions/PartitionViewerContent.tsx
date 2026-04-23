'use client'

import { PartitionDeleteDialog } from '@/components/partitions/PartitionDeleteDialog'
import { PartitionSvgDisplay } from '@/components/partitions/PartitionSvgDisplay'
import { PartitionViewerHeader } from '@/components/partitions/PartitionViewerHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { usePartitionViewer } from '@/hooks/usePartitionViewer'

type Props = {
  id: string
}

export function PartitionViewerContent({ id }: Props) {
  const {
    partition,
    svgContent,
    svgError,
    isLoading,
    isRenaming,
    setIsRenaming,
    renameValue,
    setRenameValue,
    deleteOpen,
    setDeleteOpen,
    renameInputRef,
    handleRenameSubmit,
    handleRenameKeyDown,
    handleDelete,
    handleDownloadSvg,
  } = usePartitionViewer(id)

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!partition) return null

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <PartitionViewerHeader
        partition={partition}
        isRenaming={isRenaming}
        renameValue={renameValue}
        renameInputRef={renameInputRef}
        svgContent={svgContent}
        onStartRenaming={() => setIsRenaming(true)}
        onRenameChange={setRenameValue}
        onRenameBlur={handleRenameSubmit}
        onRenameKeyDown={handleRenameKeyDown}
        onDownload={handleDownloadSvg}
      />

      <PartitionSvgDisplay
        svgError={svgError}
        svgContent={svgContent}
        onDeleteClick={() => setDeleteOpen(true)}
      />

      {partition.notes && (
        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium mb-1">Notes</p>
          <p className="text-sm text-muted-foreground">{partition.notes}</p>
        </div>
      )}

      <PartitionDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={partition.title}
        onConfirm={handleDelete}
      />
    </div>
  )
}
