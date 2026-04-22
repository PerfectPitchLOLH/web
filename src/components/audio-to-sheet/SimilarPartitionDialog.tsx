import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  similarPartitions: { id: string; title: string }[]
  onConfirm: () => void
}

export function SimilarPartitionDialog({
  open,
  onOpenChange,
  similarPartitions,
  onConfirm,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Partition similaire existante</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              Vous avez déjà une partition avec un titre similaire :
              <ul className="mt-2 space-y-1">
                {similarPartitions.map((p) => (
                  <li key={p.id} className="font-medium text-foreground">
                    {p.title}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Transcrire quand même
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
