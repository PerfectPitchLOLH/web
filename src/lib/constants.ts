export const COLORS = {
  brand: {
    primary: '#ff6b35',
    accent: '#ffa500',
    deepBlack: '#0a0a0a',
    darkGray: '#1a1a1a',
    mediumGray: '#2a2a2a',
  },
  text: {
    white: '#ffffff',
    white85: 'rgba(255, 255, 255, 0.85)',
    white70: 'rgba(255, 255, 255, 0.70)',
    white60: 'rgba(255, 255, 255, 0.60)',
  },
} as const

export const SPACING = {
  section: {
    desktop: '120px',
    mobile: '80px',
  },
  gap: {
    xs: '8px',
    sm: '16px',
    md: '24px',
    lg: '32px',
    xl: '48px',
    xxl: '64px',
  },
} as const

export const TYPOGRAPHY = {
  hero: {
    headline: {
      desktop: '64px',
      mobile: '48px',
    },
    subheadline: {
      desktop: '20px',
      mobile: '18px',
    },
  },
  section: {
    headline: '48px',
    subheadline: '20px',
  },
  body: {
    large: '18px',
    regular: '16px',
    small: '14px',
  },
  cta: {
    large: '20px',
    regular: '18px',
    small: '16px',
  },
} as const

export const STATS = {
  musicians: '12,847',
  songsTranscribed: '2.4M',
  countries: '127',
  rating: '4.8',
  reviewCount: '2,340',
} as const

export const PRICING = {
  monthly: 29,
  annual: 279,
  annualSavings: 69,
  trialDays: 14,
} as const
