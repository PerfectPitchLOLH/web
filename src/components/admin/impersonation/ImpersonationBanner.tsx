'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState } from 'react'

export function ImpersonationBanner() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  if (!session?.impersonation?.isActive) {
    return null
  }

  const handleExit = async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/impersonation/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.impersonation?.sessionId,
        }),
      })

      if (response.ok) {
        router.push('/admin/users')
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to end impersonation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-orange-300 bg-orange-100 px-4 py-2 shadow-lg dark:border-orange-800 dark:bg-orange-950">
      <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
        Vue en tant que <span className="font-bold">{session.user.name}</span>
      </p>

      <button
        onClick={handleExit}
        disabled={isLoading}
        className="flex size-6 items-center justify-center rounded-full text-orange-700 transition-colors hover:bg-orange-200 disabled:opacity-50 dark:text-orange-300 dark:hover:bg-orange-900"
        title="Quitter la vue"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  )
}
