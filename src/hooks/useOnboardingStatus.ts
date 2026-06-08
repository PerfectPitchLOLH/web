'use client'

import { useEffect, useState } from 'react'

export function useOnboardingStatus() {
  const [shouldShowTour, setShouldShowTour] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.success) {
          setShouldShowTour(data.data.onboardingCompleted === false)
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  return { shouldShowTour }
}
