'use client'

import { Settings } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useDevMode } from '@/contexts/DevModeContext'

import { DevModePanel } from './DevModePanel'

export function DevModeToggle() {
  const { isAdmin, isActive } = useDevMode()
  const [isOpen, setIsOpen] = useState(false)

  if (!isAdmin) {
    return null
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant={isActive ? 'default' : 'outline'}
          size="sm"
          className="relative gap-2"
        >
          <Settings className="size-4" />
          <span className="hidden sm:inline">Dev Mode</span>
          {isActive && (
            <Badge
              variant="secondary"
              className="absolute -right-1 -top-1 size-2 p-0"
            />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="size-5" />
            Mode Développeur
          </SheetTitle>
          <SheetDescription>
            Prévisualisez l'application avec différents types d'abonnement et
            configurations.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <DevModePanel onClose={() => setIsOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
