'use client'

import { Hourglass } from 'lucide-react'
import Link from 'next/link'

export function ExpiringCreditsNotice({
  minutes,
  daysLeft,
}: {
  minutes: number
  daysLeft: number
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
        <Hourglass className="size-4 shrink-0" />
        <span>
          <span className="font-medium">{minutes} min</span> expirent dans{' '}
          {daysLeft} jour{daysLeft > 1 ? 's' : ''}
        </span>
      </div>
      <Link
        href="/dashboard/audio-to-sheet"
        className="font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
      >
        Transcrire maintenant
      </Link>
    </div>
  )
}
