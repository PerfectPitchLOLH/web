const TEST = {
  plans: {
    junior: {
      monthly: 'price_1T8ymd98tB4JxI77x3XGiVvL',
      yearly: 'price_1T8ymd98tB4JxI77KWBCjCC5',
    },
    basic: {
      monthly: 'price_1T8yme98tB4JxI77jmPknCoT',
      yearly: 'price_1T8yme98tB4JxI779JBupgqG',
    },
    pro: {
      monthly: 'price_1T8yme98tB4JxI77tzI49lVj',
      yearly: 'price_1T8ymf98tB4JxI77KP3nNyXm',
    },
  },
  credits: {
    small: 'price_1T8ymf98tB4JxI77hQ3TUA0G',
    medium: 'price_1T8ymg98tB4JxI77EeVI7Ogs',
    big: 'price_1T8ymh98tB4JxI77CPutcUjs',
  },
}

const LIVE = {
  plans: {
    junior: { monthly: 'price_LIVE_REPLACE', yearly: 'price_LIVE_REPLACE' },
    basic: { monthly: 'price_LIVE_REPLACE', yearly: 'price_LIVE_REPLACE' },
    pro: { monthly: 'price_LIVE_REPLACE', yearly: 'price_LIVE_REPLACE' },
  },
  credits: {
    small: 'price_LIVE_REPLACE',
    medium: 'price_LIVE_REPLACE',
    big: 'price_LIVE_REPLACE',
  },
}

export const STRIPE_PRICES =
  process.env.NEXT_PUBLIC_STRIPE_MODE === 'live' ? LIVE : TEST
