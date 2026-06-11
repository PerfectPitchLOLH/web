import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getExpiringCredits } from '@/lib/credits'

const NOW = new Date('2026-06-11T12:00:00Z')

function refillDaysAgo(days: number): string {
  const d = new Date(NOW)
  d.setMonth(d.getMonth() - 1)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

describe('getExpiringCredits', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null when no refill date', () => {
    expect(
      getExpiringCredits({
        monthlyCredits: 1800,
        usedThisMonth: 0,
        lastMonthlyRefill: null,
      }),
    ).toBeNull()
  })

  it('returns null when refill is more than 7 days away', () => {
    expect(
      getExpiringCredits({
        monthlyCredits: 1800,
        usedThisMonth: 0,
        lastMonthlyRefill: refillDaysAgo(15),
      }),
    ).toBeNull()
  })

  it('returns null when remaining monthly minutes are below threshold', () => {
    expect(
      getExpiringCredits({
        monthlyCredits: 1800,
        usedThisMonth: 1500,
        lastMonthlyRefill: refillDaysAgo(3),
      }),
    ).toBeNull()
  })

  it('returns minutes and daysLeft when expiring soon with enough credits', () => {
    const result = getExpiringCredits({
      monthlyCredits: 1800,
      usedThisMonth: 600,
      lastMonthlyRefill: refillDaysAgo(3),
    })
    expect(result).toEqual({ minutes: 20, daysLeft: 3 })
  })

  it('returns null when next refill is in the past', () => {
    expect(
      getExpiringCredits({
        monthlyCredits: 1800,
        usedThisMonth: 0,
        lastMonthlyRefill: refillDaysAgo(-2),
      }),
    ).toBeNull()
  })

  it('ignores bonus credits — only monthly minutes expire', () => {
    const result = getExpiringCredits({
      monthlyCredits: 1200,
      usedThisMonth: 0,
      lastMonthlyRefill: refillDaysAgo(1),
    })
    expect(result).toEqual({ minutes: 20, daysLeft: 1 })
  })
})
