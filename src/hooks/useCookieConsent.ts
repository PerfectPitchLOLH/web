'use client'

import { useCallback, useEffect, useState } from 'react'

export type CookieConsent = {
  analytics: boolean
  date: string
}

const STORAGE_KEY = 'cookie_consent'

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null | undefined>(
    undefined,
  )

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    setConsent(stored ? (JSON.parse(stored) as CookieConsent) : null)
  }, [])

  const save = useCallback((analytics: boolean) => {
    const value: CookieConsent = { analytics, date: new Date().toISOString() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    setConsent(value)
  }, [])

  return {
    consent,
    hasChosen: consent !== null && consent !== undefined,
    isLoading: consent === undefined,
    acceptAll: useCallback(() => save(true), [save]),
    rejectAll: useCallback(() => save(false), [save]),
  }
}
