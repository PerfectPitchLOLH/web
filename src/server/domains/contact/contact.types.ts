export type ContactCategory =
  | 'general'
  | 'choice_help'
  | 'payment_issue'
  | 'technical_bug'
  | 'feature_request'
  | 'other'

export type SubmitContactDTO = {
  category: ContactCategory
  message: string
  name?: string
  email?: string
}

export type ContactSender = {
  name?: string | null
  email?: string | null
}
