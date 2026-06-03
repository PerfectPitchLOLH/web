'use client'

import { ShieldAlert } from 'lucide-react'
import { memo } from 'react'

export const ProtectionOverlay = memo(function ProtectionOverlay() {
  return (
    <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200 gap-4">
      <ShieldAlert className="h-16 w-16 text-red-500 animate-pulse" />
      <div className="text-center space-y-2 max-w-md px-4">
        <h3 className="text-xl font-semibold text-foreground">
          Protection activée
        </h3>
        <p className="text-sm text-muted-foreground">
          Une action suspecte a été détectée. La partition est temporairement
          protégée.
        </p>
      </div>
    </div>
  )
})
