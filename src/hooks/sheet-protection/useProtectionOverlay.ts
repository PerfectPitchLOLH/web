'use client'

import { type RefObject, useCallback, useRef, useState } from 'react'

import { PROTECTION_CONSTANTS } from '@/lib/sheet-protection/protection.constants'

interface UseProtectionOverlayOptions {
  enabled: boolean
  containerRef: RefObject<HTMLDivElement | null>
  isRefReady: boolean
}

interface UseProtectionOverlayReturn {
  isOverlayVisible: boolean
  showOverlay: () => void
  hideOverlay: () => void
}

export function useProtectionOverlay({
  enabled,
  containerRef,
  isRefReady,
}: UseProtectionOverlayOptions): UseProtectionOverlayReturn {
  const [isOverlayVisible, setIsOverlayVisible] = useState(false)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const showOverlay = useCallback(() => {
    if (!enabled) return

    setIsOverlayVisible(true)

    if (isRefReady && containerRef.current) {
      containerRef.current.style.filter = `blur(${PROTECTION_CONSTANTS.BLUR_INTENSITY})`
    }

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
  }, [enabled, isRefReady, containerRef])

  const hideOverlay = useCallback(() => {
    if (!enabled) return

    hideTimeoutRef.current = setTimeout(() => {
      setIsOverlayVisible(false)

      if (isRefReady && containerRef.current) {
        containerRef.current.style.filter = 'none'
      }
    }, PROTECTION_CONSTANTS.OVERLAY_HIDE_DELAY)
  }, [enabled, isRefReady, containerRef])

  return {
    isOverlayVisible,
    showOverlay,
    hideOverlay,
  }
}
