'use client'

import { useCallback, useEffect } from 'react'

interface UseScreenShareDetectionOptions {
  enabled: boolean
  onShareStart: () => void
  onShareEnd: () => void
}

export function useScreenShareDetection({
  enabled,
  onShareStart,
  onShareEnd,
}: UseScreenShareDetectionOptions) {
  const handleShareEnd = useCallback(() => {
    onShareEnd()
  }, [onShareEnd])

  useEffect(() => {
    if (!enabled || !navigator.mediaDevices?.getDisplayMedia) return

    const original = navigator.mediaDevices.getDisplayMedia.bind(
      navigator.mediaDevices,
    )

    navigator.mediaDevices.getDisplayMedia = async function (
      constraints?: DisplayMediaStreamOptions,
    ) {
      const stream = await original(constraints)
      onShareStart()

      let activeTracks = stream.getTracks().length

      stream.getTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          activeTracks -= 1
          if (activeTracks <= 0) {
            handleShareEnd()
          }
        })
      })

      return stream
    }

    return () => {
      navigator.mediaDevices.getDisplayMedia = original
    }
  }, [enabled, onShareStart, handleShareEnd])
}
