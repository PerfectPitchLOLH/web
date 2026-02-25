'use client'

import { useEffect, useState } from 'react'

export function useResponsiveWaveAmplitude() {
  const [amplitude, setAmplitude] = useState(155)

  useEffect(() => {
    const updateAmplitude = () => {
      const width = window.innerWidth

      if (width < 640) {
        setAmplitude(70)
      } else if (width < 1024) {
        setAmplitude(110)
      } else {
        setAmplitude(155)
      }
    }

    updateAmplitude()

    window.addEventListener('resize', updateAmplitude)
    return () => window.removeEventListener('resize', updateAmplitude)
  }, [])

  return amplitude
}
