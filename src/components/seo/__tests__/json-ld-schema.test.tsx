import { describe, expect, it } from 'vitest'

import { JsonLdSchema } from '@/components/seo/json-ld-schema'
import { PLAN_PRICING } from '@/server/domains/subscription/subscription.constants'

function readSchema() {
  const element = JsonLdSchema()
  return JSON.parse(element.props.dangerouslySetInnerHTML.__html)
}

describe('JsonLdSchema', () => {
  it('declares no fabricated rating or review', () => {
    const raw = JSON.stringify(readSchema())

    expect(raw).not.toContain('aggregateRating')
    expect(raw).not.toContain('AggregateRating')
    expect(raw).not.toContain('ratingValue')
    expect(raw).not.toContain('"review"')
  })

  it('declares no invented version, screenshot or publication date', () => {
    const schema = readSchema()

    expect(schema.softwareVersion).toBeUndefined()
    expect(schema.screenshot).toBeUndefined()
    expect(schema.datePublished).toBeUndefined()
  })

  it('lists one euro offer per real plan with the plan monthly price', () => {
    const { offers } = readSchema()
    const expected = Object.entries(PLAN_PRICING).map(([tier, p]) => ({
      name: tier.charAt(0).toUpperCase() + tier.slice(1),
      price: p.monthly.toFixed(2),
    }))

    expect(offers.priceCurrency).toBe('EUR')
    expect(offers.offerCount).toBe(String(expected.length))
    expect(
      offers.offers.map((o: { name: string; price: string }) => ({
        name: o.name,
        price: o.price,
      })),
    ).toEqual(expected)
    for (const offer of offers.offers) {
      expect(offer.priceCurrency).toBe('EUR')
      expect(offer.priceSpecification.price).toBe(offer.price)
      expect(offer.priceSpecification.priceCurrency).toBe('EUR')
    }
  })

  it('bounds the aggregate offer with the cheapest and priciest plan', () => {
    const { offers } = readSchema()

    expect(offers.lowPrice).toBe('9.99')
    expect(offers.highPrice).toBe('29.99')
  })

  it('has no free plan offer', () => {
    const { offers } = readSchema()

    expect(
      offers.offers.every((o: { price: string }) => Number(o.price) > 0),
    ).toBe(true)
  })
})
