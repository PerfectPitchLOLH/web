export function secondsToMinutes(seconds: number): number {
  return Math.floor(seconds / 60)
}

export function computeUsagePercent(
  usedSeconds: number,
  totalSeconds: number,
): number {
  if (totalSeconds <= 0) return 0
  return Math.min(100, (usedSeconds / totalSeconds) * 100)
}

export function getCreditProgressColor(
  remainingSeconds: number,
  totalSeconds: number,
): string {
  const ratio = remainingSeconds / Math.max(totalSeconds, 1)
  if (ratio > 0.5) return 'bg-green-500'
  if (ratio > 0.2) return 'bg-orange-500'
  return 'bg-red-500'
}

export function getNextRefillDate(
  lastMonthlyRefill: string | null,
): Date | null {
  if (!lastMonthlyRefill) return null
  const next = new Date(lastMonthlyRefill)
  next.setMonth(next.getMonth() + 1)
  return next
}

export function formatLocalDate(date: Date | string | null): string {
  if (!date) return 'Non défini'
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
