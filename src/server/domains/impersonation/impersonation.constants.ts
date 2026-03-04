export const IMPERSONATION_ACTIONS = {
  STARTED: 'impersonation_started',
  ENDED: 'impersonation_ended',
  ACTION: 'impersonation_action',
  UNAUTHORIZED: 'impersonation_unauthorized',
  RATE_LIMIT: 'impersonation_rate_limit',
} as const

export const IMPERSONATION_EVENTS = {
  START: 'IMPERSONATION_START',
  END: 'IMPERSONATION_END',
  ACTION: 'IMPERSONATION_ACTION',
  UNAUTHORIZED: 'IMPERSONATION_UNAUTHORIZED',
  RATE_LIMIT: 'IMPERSONATION_RATE_LIMIT',
} as const

export const MAX_SESSION_DURATION_MS = 30 * 60 * 1000
