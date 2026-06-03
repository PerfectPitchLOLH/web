# Stratégies de Data Fetching

## Vue d'Ensemble

Ce guide explique quand et comment fetcher les données dans l'application Notavex.

## Server Components vs Client Components

### Decision Tree

```
Besoin de fetcher des données?
│
├─ Données statiques ou rarement mises à jour?
│  └─ ✅ SERVER COMPONENT avec ISR/SSG
│
├─ Données liées à l'utilisateur connecté?
│  │
│  ├─ Données dans la session (nom, email, role)?
│  │  └─ ✅ SESSION (pas de fetch)
│  │
│  └─ Autres données utilisateur?
│     │
│     ├─ Changent rarement?
│     │  └─ ✅ SERVER COMPONENT
│     │
│     └─ Changent fréquemment?
│        └─ ✅ CLIENT COMPONENT + SWR
│
└─ Données temps réel ou interactives?
   └─ ✅ CLIENT COMPONENT + SWR/WebSocket
```

## 1. Server Components (Préféré)

### Quand Utiliser

- Données statiques ou rarement mises à jour
- SEO important
- Pas d'interactivité nécessaire
- Peut être caché côté serveur

### Exemple : Dashboard Page

```tsx
// app/(dashboard)/dashboard/page.tsx
import { auth } from '@/server/lib/auth'
import { db } from '@/server/lib/database'

// ✅ Server Component
export default async function DashboardPage() {
  const session = await auth()

  // Fetch des données directement
  const stats = await db.userStats.findUnique({
    where: { userId: session.user.id },
  })

  return (
    <div>
      <h1>Bienvenue {session.user.name}</h1>
      <StatsCard data={stats} />
    </div>
  )
}
```

### Caching avec ISR

```tsx
// Revalider toutes les 5 minutes
export const revalidate = 300

export default async function Page() {
  const data = await fetch('https://api.example.com/data')
  return <div>{data}</div>
}
```

### Avantages

- ✅ Pas de JavaScript client
- ✅ Meilleur SEO
- ✅ Caching automatique
- ✅ Chargement initial rapide

### Inconvénients

- ❌ Pas d'interactivité
- ❌ Re-render complet à chaque revalidation
- ❌ Pas de mise à jour temps réel

## 2. Session Data (Le Plus Rapide)

### Quand Utiliser

- Données utilisateur de base (nom, email, role)
- Informations d'authentification
- Données qui ne changent presque jamais

### Architecture

```tsx
// app/(dashboard)/layout.tsx (Server)
export default async function Layout({ children }) {
  const session = await auth() // ✅ Une seule fois côté serveur

  return <DashboardShell session={session}>{children}</DashboardShell>
}

// components/DashboardShell.tsx (Client)
;('use client')
export function DashboardShell({ session, children }) {
  return (
    <SessionProvider session={session}>
      {' '}
      {/* ✅ Passée aux enfants */}
      {children}
    </SessionProvider>
  )
}

// components/UserMenu.tsx (Client)
;('use client')
export function UserMenu() {
  const { data: session } = useSession() // ✅ Déjà disponible, pas de fetch

  return <div>{session.user.name}</div>
}
```

### Ce Qui Est Disponible dans la Session

D'après notre configuration NextAuth (`src/server/lib/auth.ts`) :

```typescript
session.user = {
  id: string
  email: string
  name: string
  role: string
  image: string | null
  emailVerified: Date | null
}
```

### Règles Importantes

1. **JAMAIS fetcher `/api/user/profile` pour obtenir nom/email** - Utiliser la session
2. **JAMAIS utiliser `useSession()` dans un Server Component** - Utiliser `auth()`
3. **TOUJOURS passer la session du serveur au SessionProvider**

## 3. Client Components avec SWR

### Quand Utiliser

- Données qui changent fréquemment
- Besoin de revalidation automatique
- Interactions utilisateur (boutons, etc.)
- Mises à jour optimistes

### Installation

```bash
npm install swr
```

### Configuration de Base

```tsx
// lib/fetcher.ts
export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error('Network response was not ok')
  }

  return res.json()
}
```

### Exemple : Credits Balance

```tsx
'use client'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

export function CreditsBalance() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/user/credits',
    fetcher,
    {
      revalidateOnFocus: false, // Pas de refetch au focus
      revalidateOnReconnect: false, // Pas de refetch à la reconnexion
      dedupingInterval: 30000, // Cache 30 secondes
    },
  )

  if (isLoading) return <CreditsSkeleton />
  if (error) return <ErrorState />

  return (
    <div>
      <p>Crédits: {data.credits}</p>
      <Button onClick={() => mutate()}>Rafraîchir</Button>
    </div>
  )
}
```

### Options SWR Importantes

| Option                  | Description                               | Valeur Recommandée     |
| ----------------------- | ----------------------------------------- | ---------------------- |
| `revalidateOnFocus`     | Refetch quand la fenêtre reprend le focus | `false`                |
| `revalidateOnReconnect` | Refetch quand internet revient            | `false`                |
| `dedupingInterval`      | Durée du cache (ms)                       | 30000-60000            |
| `refreshInterval`       | Polling automatique                       | 0 (désactivé) ou 30000 |
| `errorRetryCount`       | Nombre de retry en cas d'erreur           | 3                      |

### Mises à Jour Optimistes

```tsx
function UpdateProfile() {
  const { data: user, mutate } = useSWR('/api/user/profile')

  const updateName = async (newName: string) => {
    // 1. Mise à jour optimiste immédiate
    mutate({ ...user, name: newName }, false)

    try {
      // 2. Requête API
      await fetch('/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: newName }),
      })

      // 3. Revalidation après succès
      mutate()
    } catch (error) {
      // 4. Rollback en cas d'erreur
      mutate()
    }
  }

  return <input onChange={(e) => updateName(e.target.value)} />
}
```

## 4. Données Temps Réel

### Polling avec SWR

```tsx
const { data } = useSWR('/api/notifications', fetcher, {
  refreshInterval: 10000, // Poll toutes les 10 secondes
})
```

### WebSocket (Futur)

```tsx
'use client'
import { useEffect, useState } from 'react'

export function RealtimeNotifications() {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    const ws = new WebSocket('wss://api.notavex.com/notifications')

    ws.onmessage = (event) => {
      const notification = JSON.parse(event.data)
      setNotifications((prev) => [notification, ...prev])
    }

    return () => ws.close()
  }, [])

  return <div>{notifications.length} nouvelles notifications</div>
}
```

## Comparaison des Approches

| Approche         | Vitesse           | Fraîcheur         | Complexité     | Use Case           |
| ---------------- | ----------------- | ----------------- | -------------- | ------------------ |
| Session          | ⚡⚡⚡ Instantané | ❌ Statique       | ✅ Très simple | Nom, email, role   |
| Server Component | ⚡⚡ Rapide       | ⚡ ISR            | ✅ Simple      | Stats, contenu     |
| SWR              | ⚡ Moyen          | ⚡⚡ Frequent     | ⚡ Moyen       | Crédits, notifs    |
| WebSocket        | ⚡⚡ Rapide       | ⚡⚡⚡ Temps réel | ❌ Complexe    | Chat, live updates |

## Exemples par Feature

### UserMenu

```tsx
'use client'
import { useSession } from 'next-auth/react'

export function UserMenu() {
  const { data: session } = useSession() // ✅ Session (pas de fetch)

  return (
    <div>
      <p>{session.user.name}</p> {/* Depuis session */}
      <p>{session.user.email}</p> {/* Depuis session */}
    </div>
  )
}
```

### Credits Card

```tsx
'use client'
import useSWR from 'swr'

export function CreditsCard() {
  const { data, isLoading } = useSWR('/api/user/credits', fetcher, {
    dedupingInterval: 30000, // ✅ SWR avec cache 30s
  })

  if (isLoading) return <CreditsSkeleton />

  return (
    <div>
      Crédits: {data.remaining} / {data.total}
    </div>
  )
}
```

### Dashboard Stats

```tsx
// ✅ Server Component
import { auth } from '@/server/lib/auth'
import { db } from '@/server/lib/database'

export const revalidate = 300 // ISR 5 minutes

export default async function DashboardStats() {
  const session = await auth()

  const stats = await db.stats.findUnique({
    where: { userId: session.user.id },
  })

  return <StatsDisplay stats={stats} />
}
```

### Recent Transcriptions

```tsx
'use client'
import useSWR from 'swr'

export function RecentTranscriptions() {
  const { data, isLoading } = useSWR('/api/transcriptions?limit=5', fetcher, {
    dedupingInterval: 60000, // ✅ Cache 1 minute
  })

  if (isLoading) return <TranscriptionsSkeleton />

  return (
    <div>
      {data.map((t) => (
        <TranscriptionCard key={t.id} data={t} />
      ))}
    </div>
  )
}
```

## Gestion des Erreurs

### Server Components

```tsx
export default async function Page() {
  try {
    const data = await db.query()
    return <Content data={data} />
  } catch (error) {
    console.error('Database error:', error)
    return <ErrorFallback />
  }
}
```

### Client Components avec SWR

```tsx
function Component() {
  const { data, error, isLoading } = useSWR('/api/data', fetcher)

  if (isLoading) return <Skeleton />
  if (error) return <ErrorState error={error} />

  return <Content data={data} />
}
```

## Revalidation Strategies

### On-Demand Revalidation

```tsx
// Server Action
'use server'
import { revalidatePath } from 'next/cache'

export async function updateUserProfile(data) {
  await db.user.update({ where: { id: userId }, data })

  // ✅ Revalider la page dashboard
  revalidatePath('/dashboard')
}
```

### SWR Revalidation

```tsx
function Component() {
  const { mutate } = useSWR('/api/data', fetcher)

  const handleUpdate = async () => {
    await updateData()
    mutate() // ✅ Force revalidation
  }

  return <Button onClick={handleUpdate}>Update</Button>
}
```

## Best Practices

1. **Préférer Server Components** sauf si interactivité nécessaire
2. **Utiliser la session** pour nom/email/role (jamais de fetch)
3. **Cacher agressivement** avec SWR (30-60s minimum)
4. **Toujours afficher des skeletons** pendant le chargement
5. **Gérer les erreurs** avec des fallbacks UI
6. **Éviter les fetches en cascade** - fetcher en parallèle quand possible

## Checklist Data Fetching

- [ ] Données utilisateur de base → Session (pas de fetch)
- [ ] Données statiques → Server Component + ISR
- [ ] Données fréquentes → Client + SWR (cache 30-60s)
- [ ] Temps réel → WebSocket ou polling
- [ ] Skeleton loader présent
- [ ] Gestion d'erreur implementée
- [ ] Pas de fetches dupliqués
- [ ] Cache configuré correctement

## Ressources

- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [SWR Documentation](https://swr.vercel.app/)
- [React Server Components](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023#react-server-components)
