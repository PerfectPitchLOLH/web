'use client'

import { useEffect } from 'react'

export function FallingNotesActivationPing() {
  useEffect(() => {
    fetch('/api/users/activation-status/falling-notes', {
      method: 'POST',
    }).catch(() => {})
  }, [])

  return null
}
