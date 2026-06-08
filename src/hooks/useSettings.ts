'use client'

import { useState } from 'react'

import type {
  ChangePasswordDTO,
  Disable2FADTO,
  NotificationPreferences,
  TwoFactorSetupResult,
  UpdateAppearanceDTO,
  UpdateProfileDTO,
  Verify2FADTO,
} from '@/server/domains/settings/settings.types'

type MutationState = {
  loading: boolean
  error: string | null
}

function useMutation<TArgs extends unknown[], TResult = void>(
  mutationFn: (...args: TArgs) => Promise<TResult>,
): [(...args: TArgs) => Promise<TResult>, MutationState] {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async (...args: TArgs): Promise<TResult> => {
    setLoading(true)
    setError(null)
    try {
      const result = await mutationFn(...args)
      return result
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Une erreur est survenue'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return [execute, { loading, error }]
}

async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = (await res.json()) as { data: T; error?: { message?: string } }
  if (!res.ok) {
    throw new Error(data.error?.message ?? 'Une erreur est survenue')
  }
  return data.data
}

export function useUpdateProfile() {
  return useMutation((data: UpdateProfileDTO) =>
    apiCall('/api/settings/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  )
}

export function useChangePassword() {
  return useMutation((data: ChangePasswordDTO) =>
    apiCall('/api/settings/password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  )
}

export function useSetup2FA() {
  return useMutation(() =>
    apiCall<TwoFactorSetupResult>('/api/settings/2fa/setup', {
      method: 'POST',
    }),
  )
}

export function useVerify2FA() {
  return useMutation((data: Verify2FADTO) =>
    apiCall('/api/settings/2fa/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  )
}

export function useDisable2FA() {
  return useMutation((data: Disable2FADTO) =>
    apiCall('/api/settings/2fa/verify', {
      method: 'DELETE',
      body: JSON.stringify(data),
    }),
  )
}

export function useUpdateNotifications() {
  return useMutation((data: Partial<NotificationPreferences>) =>
    apiCall('/api/settings/notifications', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  )
}

export function useUpdateAppearance() {
  return useMutation((data: UpdateAppearanceDTO) =>
    apiCall('/api/settings/appearance', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  )
}

export function useExportData() {
  return useMutation(() =>
    apiCall<object>('/api/settings/export', { method: 'POST' }),
  )
}

export function useDeleteAccount() {
  return useMutation(() =>
    apiCall('/api/settings/account', { method: 'DELETE' }),
  )
}

export function useCompleteOnboarding() {
  return useMutation(() =>
    apiCall('/api/settings/onboarding', { method: 'POST' }),
  )
}
