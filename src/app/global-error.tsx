'use client'

import * as Sentry from '@sentry/nextjs'
import { Home, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error(error)
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          backgroundColor: '#09090b',
          color: '#fafafa',
          padding: '1rem',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '480px', width: '100%' }}>
          <h1
            style={{
              fontSize: '5rem',
              fontWeight: 700,
              background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: '0 0 1rem',
            }}
          >
            500
          </h1>
          <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.75rem' }}>
            Erreur critique
          </h2>
          <p style={{ color: '#a1a1aa', marginBottom: '2rem' }}>
            Une erreur critique est survenue. Veuillez recharger la page.
          </p>
          <div
            style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}
          >
            <button
              onClick={reset}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: '#6366f1',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              <RefreshCw size={16} />
              Réessayer
            </button>
            <a
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: '1px solid #3f3f46',
                color: '#fafafa',
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              <Home size={16} />
              Accueil
            </a>
          </div>
          {error.digest && (
            <p
              style={{
                color: '#71717a',
                fontSize: '0.75rem',
                marginTop: '1.5rem',
              }}
            >
              Code : {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
