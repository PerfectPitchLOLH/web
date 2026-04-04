'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { type SuspiciousActivityType } from '@/lib/sheet-protection/protection.constants'

import { useContextMenuBlock } from './useContextMenuBlock'
import { useProtectionOverlay } from './useProtectionOverlay'
import { useScreenShareDetection } from './useScreenShareDetection'

interface UseSheetProtectionOptions {
  enabled?: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
  onSuspiciousActivity?: (type: SuspiciousActivityType, count: number) => void
}

interface UseSheetProtectionReturn {
  isProtected: boolean
  isOverlayVisible: boolean
  suspiciousActivityCount: number
}

export function useSheetProtection(
  options: UseSheetProtectionOptions,
): UseSheetProtectionReturn {
  const { enabled = true, containerRef, onSuspiciousActivity } = options

  const [suspiciousActivityCount, setSuspiciousActivityCount] = useState(0)
  const [isRefReady, setIsRefReady] = useState(false)
  const suspiciousActivityCountRef = useRef(0)

  useEffect(() => {
    suspiciousActivityCountRef.current = suspiciousActivityCount
  }, [suspiciousActivityCount])

  useEffect(() => {
    if (containerRef.current && !isRefReady) {
      setIsRefReady(true)
    }
  }, [containerRef, isRefReady])

  const handleSuspiciousActivity = useCallback(
    (type: SuspiciousActivityType) => {
      setSuspiciousActivityCount((prev) => {
        const newCount = prev + 1
        onSuspiciousActivity?.(type, newCount)
        return newCount
      })
    },
    [onSuspiciousActivity],
  )

  const { isOverlayVisible, showOverlay, hideOverlay } = useProtectionOverlay({
    enabled,
    containerRef,
    isRefReady,
  })

  useScreenShareDetection({
    enabled,
    onShareStart: () => {
      handleSuspiciousActivity('screen-share')
      showOverlay()
    },
    onShareEnd: hideOverlay,
  })

  useContextMenuBlock({
    enabled,
    containerRef,
    isRefReady,
    onAttempt: () => {
      handleSuspiciousActivity('context-menu')
    },
  })

  return {
    isProtected: enabled,
    isOverlayVisible,
    suspiciousActivityCount,
  }
}
