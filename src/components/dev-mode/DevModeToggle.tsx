'use client'

import { Settings } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useDevMode } from '@/contexts/DevModeContext'

import { DevModeForm } from './DevModeForm'

export function DevModeToggle() {
  const { isAdmin, isActive } = useDevMode()
  const [isOpen, setIsOpen] = useState(false)

  if (!isAdmin) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
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
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="size-5" />
            Configurer le Mode Développeur
          </DialogTitle>
          <DialogDescription>
            Simulez différents types d'abonnement et configurations de crédits
            pour tester l'application.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <DevModeForm onSuccess={() => setIsOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
