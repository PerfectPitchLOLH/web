'use client'

import { useSession } from 'next-auth/react'
import React, { createContext, useCallback, useContext } from 'react'

import type {
  ActivateDevModeDTO,
  DevModeConfig,
  DevModePreset,
  UpdateDevModeDTO,
} from '@/server/domains/dev-mode/dev-mode.types'

type DevModeContextType = {
  config: DevModeConfig | null
  isActive: boolean
  isAdmin: boolean
  activate: (data: ActivateDevModeDTO) => Promise<void>
  update: (data: UpdateDevModeDTO) => Promise<void>
  deactivate: () => Promise<void>
  activatePreset: (presetId: string) => Promise<void>
  getPresets: () => Promise<DevModePreset[]>
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

  const activate = useCallback(
    async (data: ActivateDevModeDTO) => {
      const response = await fetch('/api/dev-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to activate dev mode')
      }

      await refresh()
    },
    [refresh],
  )

  const update = useCallback(
    async (data: UpdateDevModeDTO) => {
      const response = await fetch('/api/dev-mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to update dev mode')
      }

      await refresh()
    },
    [refresh],
  )

  const deactivate = useCallback(async () => {
    const response = await fetch('/api/dev-mode', {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Failed to deactivate dev mode')
    }

    await refresh()
  }, [refresh])

  const activatePreset = useCallback(
    async (presetId: string) => {
      const response = await fetch('/api/dev-mode/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId }),
      })

      if (!response.ok) {
        throw new Error('Failed to activate preset')
      }

      await refresh()
    },
    [refresh],
  )

  const getPresets = useCallback(async (): Promise<DevModePreset[]> => {
    const response = await fetch('/api/dev-mode/presets')

    if (!response.ok) {
      throw new Error('Failed to fetch presets')
    }

    const data = await response.json()
    return data.data?.presets ?? []
  }, [])

  const value: DevModeContextType = {
    config,
    isActive,
    isAdmin,
    activate,
    update,
    deactivate,
    activatePreset,
    getPresets,
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
