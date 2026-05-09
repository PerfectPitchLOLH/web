'use client'

import { Users } from 'lucide-react'

export function AffiliatePageContent() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="rounded-full bg-muted p-6">
        <Users className="size-10 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-semibold">Programme affilié</h1>
      <p className="text-muted-foreground max-w-md">
        Le programme d&apos;affiliation Notavex arrive bientôt. Revenez
        prochainement pour gagner des commissions en recommandant Notavex.
      </p>
    </div>
  )
}
