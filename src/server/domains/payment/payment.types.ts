export type CreatePaymentIntentRequest = {
  amount: number
  currency?: string
  metadata?: Record<string, string>
}

export type CreatePaymentIntentResponse = {
  clientSecret: string
  paymentIntentId: string
}

export type CreateCheckoutSessionRequest = {
  bundleId: string
  bundleName: string
  minutes: number
  priceId: string
}

export type CreateCheckoutSessionResponse = {
  sessionId: string
  url: string
}

export type ConfirmPaymentRequest = {
  paymentIntentId: string
}

export type PaymentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'requires_capture'
  | 'processing'
  | 'succeeded'
  | 'canceled'

export type PaymentIntentStatus = {
  id: string
  status: PaymentStatus
  amount: number
  currency: string
}
