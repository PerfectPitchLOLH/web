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

import type { ActionDialog } from './types'

type ActionDialogsProps = {
  actionDialog: ActionDialog
  onClose: () => void
  onConfirmSuspend: () => Promise<void>
  onConfirmDelete: () => Promise<void>
}

export function ActionDialogs({
  actionDialog,
  onClose,
  onConfirmSuspend,
  onConfirmDelete,
}: ActionDialogsProps) {
  return (
    <>
      <AlertDialog
        open={actionDialog.type === 'suspend'}
        onOpenChange={onClose}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog.user?.status === 'suspended'
                ? 'Réactiver le compte'
                : 'Suspendre le compte'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog.user?.status === 'suspended'
                ? `Êtes-vous sûr de vouloir réactiver le compte de ${actionDialog.user?.email} ?`
                : `Êtes-vous sûr de vouloir suspendre le compte de ${actionDialog.user?.email} ? L'utilisateur ne pourra plus se connecter.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmSuspend}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={actionDialog.type === 'delete'} onOpenChange={onClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le compte</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le compte de{' '}
              {actionDialog.user?.email} ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
