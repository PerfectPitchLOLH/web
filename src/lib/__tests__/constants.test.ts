import { describe, expect, it } from 'vitest'

import { PRICING } from '@/lib/constants'
import { PLAN_PRICING } from '@/server/domains/subscription/subscription.constants'

describe('PRICING', () => {
  it('matches the subscription domain plan pricing', () => {
    expect(PRICING).toEqual(PLAN_PRICING)
  })
})
