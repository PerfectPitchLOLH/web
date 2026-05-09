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
    junior: {
      monthly: 'price_1TVABm98tB4JxI77HDtzakrX',
      yearly: 'price_1TVABm98tB4JxI77Ol4MCCcZ',
    },
    basic: {
      monthly: 'price_1TVABn98tB4JxI77ZcqtXdrK',
      yearly: 'price_1TVABn98tB4JxI77aNPrsyBh',
    },
    pro: {
      monthly: 'price_1TVABo98tB4JxI77z1hrUveV',
      yearly: 'price_1TVABo98tB4JxI77G8BCVPLU',
    },
  },
  credits: {
    small: 'price_1TVABp98tB4JxI77pmEUj2qh',
    medium: 'price_1TVABp98tB4JxI77nPxKwN2C',
    big: 'price_1TVABq98tB4JxI77bINCbfx7',
  },
}

export const STRIPE_PRICES = process.env.NODE_ENV === 'production' ? LIVE : TEST
