'use client'

import { Elements } from '@stripe/react-stripe-js'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { useEffect, useState } from 'react'

let stripePromise: Promise<Stripe | null>

const getStripe = () => {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!key) {
      console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined')
      stripePromise = Promise.resolve(null)
    } else {
      stripePromise = loadStripe(key)
    }
  }
  return stripePromise
}

export function StripeProvider({ children }: { children: React.ReactNode }) {
  const [stripe, setStripe] = useState<Stripe | null>(null)

  useEffect(() => {
    getStripe().then(setStripe)
  }, [])

  if (!stripe) {
    return <>{children}</>
  }

  return (
    <Elements
      stripe={stripe}
      options={{
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: 'hsl(var(--primary))',
          },
        },
      }}
    >
      {children}
    </Elements>
  )
}
