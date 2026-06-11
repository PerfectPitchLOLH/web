'use client'

import { useSession } from 'next-auth/react'

import { FirstTranscriptionCard } from '@/components/dashboard/FirstTranscriptionCard'
import { useActivationStatus } from '@/hooks/useActivationStatus'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bonjour'
  if (hour < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

export function DashboardWelcome() {
  const { data: session } = useSession()
  const { status, loading } = useActivationStatus()

  if (loading) {
    return (
      <div className="h-full min-h-32 animate-pulse rounded-2xl border border-border/50 bg-muted/30" />
    )
  }

  if (status && !status.hasTranscription) {
    return <FirstTranscriptionCard />
  }

  const name = session?.user?.name
  const greeting = getGreeting()

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="font-semibold">
        {name ? `${greeting}, ${name} !` : `${greeting} !`}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Votre espace de travail pour transformer vos enregistrements audio en
        partitions et tablatures
      </p>
    </div>
  )
}
