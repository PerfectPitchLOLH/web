'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'

import type { ContactCategory } from '@/server/domains/contact/contact.types'

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

export type ContactFormValues = {
  category: ContactCategory
  message: string
  name?: string
  email?: string
}

type SubmitContactPayload = {
  category: ContactCategory
  message: string
  name?: string
  email?: string
}

export function useContactForm() {
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated'
  const [submitContact, { loading, error }] = useMutation(
    (data: SubmitContactPayload) =>
      apiCall<{ message: string }>('/api/contact', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  )
  const [success, setSuccess] = useState(false)

  const submit = async (input: ContactFormValues) => {
    setSuccess(false)
    await submitContact(
      isAuthenticated
        ? { category: input.category, message: input.message }
        : input,
    )
    setSuccess(true)
  }

  return {
    isAuthenticated,
    isLoadingSession: status === 'loading',
    sessionName: session?.user?.name ?? null,
    sessionEmail: session?.user?.email ?? null,
    submit,
    loading,
    error,
    success,
  }
}
