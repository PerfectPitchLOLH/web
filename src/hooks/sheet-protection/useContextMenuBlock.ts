'use client'

import { type RefObject, useCallback, useEffect } from 'react'

interface UseContextMenuBlockOptions {
  enabled: boolean
  containerRef: RefObject<HTMLElement | null>
  isRefReady: boolean
  onAttempt?: () => void
}

export function useContextMenuBlock({
  enabled,
  containerRef,
  isRefReady,
  onAttempt,
}: UseContextMenuBlockOptions) {
  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      if (!enabled) return

      e.preventDefault()
      e.stopPropagation()
      onAttempt?.()

      return false
    },
    [enabled, onAttempt],
  )

  const handleDragStart = useCallback(
    (e: DragEvent) => {
      if (!enabled) return

      e.preventDefault()
      e.stopPropagation()
      onAttempt?.()

      return false
    },
    [enabled, onAttempt],
  )

  const handleSelectStart = useCallback(
    (e: Event) => {
      if (!enabled) return

      e.preventDefault()
      e.stopPropagation()

      return false
    },
    [enabled],
  )

  useEffect(() => {
    if (!enabled || !isRefReady || !containerRef.current) return

    const element = containerRef.current

    element.addEventListener('contextmenu', handleContextMenu)
    element.addEventListener('dragstart', handleDragStart)
    element.addEventListener('selectstart', handleSelectStart)

    return () => {
      element.removeEventListener('contextmenu', handleContextMenu)
      element.removeEventListener('dragstart', handleDragStart)
      element.removeEventListener('selectstart', handleSelectStart)
    }
  }, [
    enabled,
    isRefReady,
    containerRef,
    handleContextMenu,
    handleDragStart,
    handleSelectStart,
  ])
}
