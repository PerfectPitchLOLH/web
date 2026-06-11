'use client'

import { useEffect, useRef, useState } from 'react'

export function useProcessingEta(progress: number): string | null {
  const baselineRef = useRef<{ time: number; progress: number } | null>(null)
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null)

  useEffect(() => {
    if (!baselineRef.current) {
      baselineRef.current = { time: Date.now(), progress }
      return
    }
    const { time, progress: initialProgress } = baselineRef.current
    const delta = progress - initialProgress
    if (delta < 3 || progress >= 100) return
    const elapsed = (Date.now() - time) / 1000
    setEtaSeconds((elapsed * (100 - progress)) / delta)
  }, [progress])

  if (etaSeconds === null) return null
  if (etaSeconds < 75) return 'moins d’une minute'
  return `~${Math.round(etaSeconds / 60)} min`
}
