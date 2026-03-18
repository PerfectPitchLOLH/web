'use client'

import { useSession } from 'next-auth/react'
import React, { createContext, useCallback, useContext } from 'react'

import type {
  ActivateDevModeDTO,
  DevModeConfig,
} from '@/server/domains/dev-mode/dev-mode.types'

type DevModeContextType = {
  config: DevModeConfig | null
  isActive: boolean
  isAdmin: boolean
  activate: (data: ActivateDevModeDTO) => Promise<void>
  deactivate: () => Promise<void>
  refresh: () => Promise<void>
}

const DevModeContext = createContext<DevModeContextType | undefined>(undefined)

export function DevModeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, update: updateSession } = useSession()

  const isAdmin = session?.user?.role === 'admin'
  const config = session?.devMode ?? null
  const isActive = config?.isActive ?? false

  const refresh = useCallback(async () => {
    await updateSession()
  }, [updateSession])

  const activate = useCallback(async (data: ActivateDevModeDTO) => {
    const response = await fetch('/api/dev-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Failed to activate dev mode')
    }

    setTimeout(() => {
      window.location.reload()
    }, 100)
  }, [])

  const deactivate = useCallback(async () => {
    const response = await fetch('/api/dev-mode', {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Failed to deactivate dev mode')
    }

    setTimeout(() => {
      window.location.reload()
    }, 100)
  }, [])

  const value: DevModeContextType = {
    config,
    isActive,
    isAdmin,
    activate,
    deactivate,
    refresh,
  }

  return (
    <DevModeContext.Provider value={value}>{children}</DevModeContext.Provider>
  )
}

export function useDevMode() {
  const context = useContext(DevModeContext)

  if (context === undefined) {
    throw new Error('useDevMode must be used within a DevModeProvider')
  }

  return context
}
