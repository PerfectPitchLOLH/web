import { FileMusic } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

export function PartitionEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 animate-in fade-in-0 zoom-in-95 duration-500">
      <FileMusic className="h-16 w-16 text-muted-foreground" />
      <div className="text-center">
        <h3 className="text-lg font-semibold">Votre bibliothèque est vide</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Transcrivez un fichier audio et sauvegardez votre première partition
          pour la retrouver ici.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard/audio-to-sheet">Lancer une transcription →</Link>
      </Button>
    </div>
  )
}
