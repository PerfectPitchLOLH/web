export function getBillingInterval(
  periodStart: string,
  periodEnd: string,
): 'monthly' | 'yearly' {
  const days = Math.round(
    (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) /
      (1000 * 60 * 60 * 24),
  )
  return days > 100 ? 'yearly' : 'monthly'
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatAmount(amount: number, currency = 'eur') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)
}

export function getYearlySavingsMonths(
  monthlyPrice: number,
  yearlyPrice: number,
) {
  if (monthlyPrice <= 0) return 0
  return Math.round((monthlyPrice * 12 - yearlyPrice) / monthlyPrice)
}
