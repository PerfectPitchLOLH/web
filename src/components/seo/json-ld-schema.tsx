export function JsonLdSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Notavex',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: '0',
      highPrice: '29',
      offerCount: '3',
      offers: [
        {
          '@type': 'Offer',
          name: 'Free Plan',
          price: '0',
          priceCurrency: 'USD',
          description: 'Perfect for learning and trying out Notavex',
        },
        {
          '@type': 'Offer',
          name: 'Pro Plan',
          price: '14',
          priceCurrency: 'USD',
          description: 'For serious musicians and music educators',
        },
        {
          '@type': 'Offer',
          name: 'Studio Plan',
          price: '29',
          priceCurrency: 'USD',
          description: 'Professional workflows for studios and composers',
        },
      ],
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1247',
      bestRating: '5',
    },
    creator: {
      '@type': 'Organization',
      name: 'Notavex Inc.',
      url: 'https://notavex.com',
    },
    datePublished: '2026-01-15',
    description:
      'AI-powered music transcription tool that transforms any song into sheet music by automatically separating every instrument from YouTube videos, audio files, or live recordings.',
    featureList: [
      'AI-powered instrument separation',
      'YouTube direct import',
      'Multi-track sheet music export',
      'Real-time playback control',
      'Professional notation formatting',
      'Cloud storage & collaboration',
    ],
    screenshot: 'https://notavex.com/screenshot.png',
    softwareVersion: '2.1.0',
    url: 'https://notavex.com',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
