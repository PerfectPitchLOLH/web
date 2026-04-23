import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'

interface PartitionDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onConfirm: () => void
}

export function PartitionDeleteDialog({
  open,
  onOpenChange,
  title,
  onConfirm,
}: PartitionDeleteDialogProps) {
  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Supprimer cette partition ?"
      description={`« ${title} » sera définitivement retirée de votre bibliothèque. Cette action est irréversible.`}
      onConfirm={onConfirm}
    />
  )
}
