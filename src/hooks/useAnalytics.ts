'use client'

import posthog from 'posthog-js'

type AnalyticsEvent =
  | {
      name: 'signup_completed'
      properties?: { method: 'email' | 'google' }
    }
  | {
      name: 'transcription_started'
      properties?: { source: 'file' | 'youtube' | 'spotify' }
    }
  | {
      name: 'transcription_completed'
      properties?: { source: 'file' | 'youtube' | 'spotify' }
    }
  | {
      name: 'subscription_created'
      properties?: { planName?: string }
    }
  | {
      name: 'credit_purchased'
      properties?: { bundleId?: string; minutes?: number }
    }
  | {
      name: 'export_downloaded'
      properties?: { format: string; partitionId?: string }
    }
  | {
      name: 'onboarding_completed'
      properties?: { skipped: boolean; lastStep: number }
    }

export function useAnalytics() {
  const track = ({ name, properties }: AnalyticsEvent) => {
    posthog.capture(name, properties)
  }

  return { track }
}
