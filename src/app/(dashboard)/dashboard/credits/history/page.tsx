import { ArrowLeft, History } from 'lucide-react'
import Link from 'next/link'

import { CreditHistoryTable } from '@/components/credits/CreditHistoryTable'
import { Button } from '@/components/ui/button'

export default function CreditHistoryPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <History className="size-5 text-amber-500" />
              <h1 className="text-2xl font-bold tracking-tight">
                Historique des crédits
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Consultez toutes vos transactions de minutes de transcription
            </p>
          </div>
        </div>

        <Button variant="outline" asChild>
          <Link href="/dashboard/subscription">Acheter des minutes</Link>
        </Button>
      </div>

      <CreditHistoryTable />
    </div>
  )
}
