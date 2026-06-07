'use client'

import posthog from 'posthog-js'
import { useEffect } from 'react'

import { useCookieConsent } from '@/hooks/useCookieConsent'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { consent, isLoading } = useCookieConsent()

  useEffect(() => {
    if (isLoading || !POSTHOG_KEY) return

    if (!posthog.__loaded) {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        autocapture: false,
        capture_pageview: false,
        opt_out_capturing_by_default: true,
      })
    }

    if (consent?.analytics) {
      posthog.opt_in_capturing()
    } else {
      posthog.opt_out_capturing()
    }
  }, [consent, isLoading])

  return <>{children}</>
}
