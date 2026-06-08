import type { ContactCategory } from './contact.types'

export const CONTACT_CATEGORIES = [
  'general',
  'choice_help',
  'payment_issue',
  'technical_bug',
  'feature_request',
  'other',
] as const

export const CONTACT_CATEGORY_LABELS: Record<ContactCategory, string> = {
  general: 'Questions générales',
  choice_help: 'Aide au choix',
  payment_issue: 'Problème de paiement',
  technical_bug: 'Bug / problème technique',
  feature_request: "Proposition d'amélioration",
  other: 'Autre',
}
