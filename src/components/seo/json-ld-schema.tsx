import {
  PLAN_PRICING,
  SUBSCRIPTION_DEFAULTS,
} from '@/server/domains/subscription/subscription.constants'

const CURRENCY = SUBSCRIPTION_DEFAULTS.CURRENCY.toUpperCase()

const monthlyOffers = Object.entries(PLAN_PRICING).map(([tier, prices]) => ({
  '@type': 'Offer',
  name: tier.charAt(0).toUpperCase() + tier.slice(1),
  price: prices.monthly.toFixed(2),
  priceCurrency: CURRENCY,
  priceSpecification: {
    '@type': 'UnitPriceSpecification',
    price: prices.monthly.toFixed(2),
    priceCurrency: CURRENCY,
    unitCode: 'MON',
  },
}))

const monthlyPrices = Object.values(PLAN_PRICING).map((p) => p.monthly)

export function JsonLdSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Notavex',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: CURRENCY,
      lowPrice: Math.min(...monthlyPrices).toFixed(2),
      highPrice: Math.max(...monthlyPrices).toFixed(2),
      offerCount: String(monthlyOffers.length),
      offers: monthlyOffers,
    },
    creator: {
      '@type': 'Organization',
      name: 'Notavex',
      url: 'https://notavex.com',
    },
    description:
      'AI-powered music transcription tool that transforms any song into sheet music by automatically separating every instrument from YouTube videos, audio files, or live recordings.',
    featureList: [
      'AI-powered instrument separation',
      'YouTube direct import',
      'Standard notation and guitar tablature views',
      'Real-time playback control',
      'Professional notation formatting',
      'Cloud-saved transcription history',
    ],
    url: 'https://notavex.com',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
