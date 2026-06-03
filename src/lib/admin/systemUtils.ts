export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}j ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function getErrorRateStatus(errorRate: number): string {
  if (errorRate < 1) return 'Excellent'
  if (errorRate < 5) return 'Bon'
  return 'Attention'
}

export function getResponseTimeStatus(responseTime: number): string {
  if (responseTime < 100) return 'Rapide'
  if (responseTime < 500) return 'Normal'
  return 'Lent'
}
