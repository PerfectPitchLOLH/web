'use client'

import { Loader2 } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'

import { useSheetProtection } from '@/hooks/sheet-protection/useSheetProtection'
import { SheetMusicCanvasRenderer } from '@/lib/sheet-protection/canvas-renderer'
import type { SuspiciousActivityType } from '@/lib/sheet-protection/protection.constants'

import { ProtectionOverlay } from './ProtectionOverlay'

interface ProtectedSheetMusicProps {
  svgContent: string
  onSuspiciousActivity?: (type: SuspiciousActivityType, count: number) => void
  enableProtection?: boolean
}

export const ProtectedSheetMusic = memo(function ProtectedSheetMusic({
  svgContent,
  onSuspiciousActivity,
  enableProtection = true,
}: ProtectedSheetMusicProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isRendering, setIsRendering] = useState(true)
  const [renderError, setRenderError] = useState<string | null>(null)

  const { isOverlayVisible, suspiciousActivityCount } = useSheetProtection({
    enabled: enableProtection,
    containerRef,
    onSuspiciousActivity: (type, count) => {
      onSuspiciousActivity?.(type, count)
    },
  })

  useEffect(() => {
    if (!canvasRef.current || !svgContent) return

    const renderer = new SheetMusicCanvasRenderer(canvasRef.current)

    setIsRendering(true)
    setRenderError(null)

    const containerWidth = containerRef.current?.clientWidth ?? 0
    const dpr = window.devicePixelRatio ?? 1

    renderer
      .renderFromSVG(svgContent, {
        targetWidth:
          containerWidth > 0 ? Math.round(containerWidth * dpr) : undefined,
        backgroundColor: '#ffffff',
      })
      .then(() => {
        setIsRendering(false)
      })
      .catch((error) => {
        console.error('Failed to render sheet music:', error)
        setRenderError('Erreur lors du rendu de la partition')
        setIsRendering(false)
      })

    return () => {
      renderer.clear()
    }
  }, [svgContent])

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-auto bg-white rounded-lg border"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">
            Chargement de la partition...
          </span>
        </div>
      )}

      {renderError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <p className="text-destructive">{renderError}</p>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-auto"
        style={{
          pointerEvents: 'none',
          touchAction: 'pan-y pinch-zoom',
        }}
      />

      {isOverlayVisible && <ProtectionOverlay />}
    </div>
  )
})
