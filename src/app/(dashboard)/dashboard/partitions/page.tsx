import { Settings } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function PartitionsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mes partitions</h1>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/settings">
            <Settings className="size-4" />
            <span>Paramètres</span>
          </Link>
        </Button>
      </div>
      <div className="rounded-lg border bg-card p-6">
        <p className="text-muted-foreground">Vos partitions apparaîtront ici</p>
      </div>
    </div>
  )
}
