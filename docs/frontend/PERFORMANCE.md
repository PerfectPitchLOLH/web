# Guidelines Performance Frontend

## Principes Fondamentaux

### 1. Architecture Server-First

**Règle** : Privilégier les Server Components par défaut.

```tsx
// ✅ BON - Server Component
import { auth } from '@/server/lib/auth'

export default async function DashboardPage() {
  const session = await auth()
  return <div>Bienvenue {session.user.name}</div>
}

// ❌ MAUVAIS - Client Component inutile
;('use client')
import { useSession } from 'next-auth/react'

export default function DashboardPage() {
  const { data: session } = useSession()
  return <div>Bienvenue {session?.user?.name}</div>
}
```

**Pourquoi** :

- Pas de JavaScript côté client
- Caching automatique Next.js
- Meilleur SEO
- Chargement initial plus rapide

### 2. Éliminer les Re-Renders Inutiles

**Utilisez React.memo pour les composants coûteux** :

```tsx
// ✅ BON - Memoized component
import { memo } from 'react'

export const UserMenu = memo(function UserMenu() {
  // Ce composant ne re-render que si ses props changent
  return <div>...</div>
})

// ❌ MAUVAIS - Re-render à chaque update du parent
export function UserMenu() {
  return <div>...</div>
}
```

**Utilisez useMemo pour les calculs coûteux** :

```tsx
import { useMemo } from 'react'

function Component({ session }) {
  // ✅ BON - Calculé uniquement quand session.user.name change
  const userName = useMemo(
    () => session?.user?.name ?? 'Guest',
    [session?.user?.name],
  )

  // ❌ MAUVAIS - Recalculé à chaque render
  const userName = session?.user?.name ?? 'Guest'
}
```

**Utilisez useCallback pour les handlers** :

```tsx
import { useCallback } from 'react'

function Component({ onUpdate }) {
  // ✅ BON - Fonction stable en mémoire
  const handleClick = useCallback(() => {
    onUpdate()
  }, [onUpdate])

  // ❌ MAUVAIS - Nouvelle fonction à chaque render
  const handleClick = () => {
    onUpdate()
  }
}
```

### 3. Toujours Afficher des Loading States

**Chaque fetch de données DOIT avoir un skeleton loader** :

```tsx
'use client'
import { useSession } from 'next-auth/react'
import { UserMenuSkeleton } from './UserMenuSkeleton'

export function UserMenu() {
  const { data: session, status } = useSession()

  // ✅ BON - Skeleton pendant le chargement
  if (status === 'loading') {
    return <UserMenuSkeleton />
  }

  return <div>{session.user.name}</div>
}
```

### 4. Optimiser les Images

**Toujours utiliser next/image** :

```tsx
import Image from 'next/image'

// ✅ BON - Optimisé automatiquement
<Image
  src={user.avatar}
  alt={user.name}
  width={40}
  height={40}
  priority={isAboveFold}
/>

// ❌ MAUVAIS - Pas d'optimisation
<img src={user.avatar} alt={user.name} width="40" height="40" />
```

## Session Management

### Règles Critiques

1. **JAMAIS utiliser `useSession()` côté serveur** - Utiliser `auth()` à la place
2. **Toujours passer la session du serveur au SessionProvider**
3. **Cacher les données dérivées de la session** (SWR/React Query)
4. **Ne PAS fetcher le profil utilisateur à chaque page** - Utiliser les données de session

### Architecture Recommandée

```tsx
// app/(dashboard)/layout.tsx (Server Component)
import { auth } from '@/server/lib/auth'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

export default async function DashboardLayout({ children }) {
  const session = await auth() // ✅ Serveur uniquement

  if (!session) redirect('/signin')

  return <DashboardShell session={session}>{children}</DashboardShell>
}

// components/dashboard/DashboardShell.tsx (Client Component)
;('use client')
import { SessionProvider } from 'next-auth/react'

export function DashboardShell({ session, children }) {
  return (
    <SessionProvider session={session}>
      {' '}
      {/* ✅ Session passée du serveur */}
      {children}
    </SessionProvider>
  )
}
```

## Stratégie de Data Fetching

### Données Statiques (changent rarement)

Utiliser Server Components avec ISR :

```tsx
// ✅ Données cachées 5 minutes
export const revalidate = 300

export default async function Page() {
  const data = await db.user.findUnique({ where: { id: userId } })
  return <div>{data.name}</div>
}
```

### Données Dynamiques (changent fréquemment)

Utiliser Client Components avec SWR :

```tsx
'use client'
import useSWR from 'swr'

export function CreditsBalance() {
  const { data, isLoading } = useSWR('/api/user/credits', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // Cache 30 secondes
  })

  if (isLoading) return <CreditsSkeleton />
  return <div>{data.credits}</div>
}
```

### Tableau de Décision

| Type de données                 | Fréquence de changement | Approche                   | Exemple           |
| ------------------------------- | ----------------------- | -------------------------- | ----------------- |
| Profil utilisateur (nom, email) | Très rare               | Session (pas de fetch)     | UserMenu          |
| Solde de crédits                | Fréquent                | Client + SWR (30s cache)   | CreditsCard       |
| Notifications                   | Temps réel              | Client + polling/WebSocket | NotificationsBell |
| Configuration app               | Jamais                  | Server Component + ISR     | Settings          |

## Monitoring Performance

### Outils Obligatoires

1. **Chrome DevTools Performance Tab**
   - Enregistrer le chargement de page
   - Vérifier les tâches longues (>50ms)
   - Identifier les re-renders inutiles

2. **React DevTools Profiler**
   - Identifier les composants qui re-render souvent
   - Vérifier la durée de render
   - Trouver les goulots d'étranglement

3. **Lighthouse Audit**
   - **Target** : Performance score > 90
   - **Target** : CLS < 0.1
   - **Target** : LCP < 2.5s
   - **Target** : FID < 100ms

4. **Network Tab**
   - Vérifier qu'il n'y a pas de requêtes dupliquées
   - Vérifier les requêtes en cascade
   - S'assurer du bon caching

### Métriques de Référence

**Dashboard actuel (après optimisations)** :

- Time to Interactive : 400-700ms
- Client session fetch : ÉLIMINÉ (0ms)
- DB queries par page : 1 (au lieu de 3)
- CLS : <0.1
- Lighthouse Performance : 90-95

## Anti-Patterns à Éviter

### ❌ 1. Fetcher les données utilisateur dans chaque composant

```tsx
// MAUVAIS
function UserProfile() {
  const { data } = useSWR('/api/user') // ❌ Fetch inutile
  return <div>{data.name}</div>
}
```

**Solution** : Utiliser les données de session ou lifter l'état

```tsx
// BON
function UserProfile({ session }) {
  return <div>{session.user.name}</div>
}
```

### ❌ 2. Créer de nouveaux objets/fonctions dans render

```tsx
// MAUVAIS
function MyComponent() {
  const handler = () => console.log('click') // ❌ Nouvelle fonction à chaque render
  return <Button onClick={handler}>Click</Button>
}
```

**Solution** : Utiliser useCallback

```tsx
// BON
function MyComponent() {
  const handler = useCallback(() => console.log('click'), [])
  return <Button onClick={handler}>Click</Button>
}
```

### ❌ 3. Utiliser useSession() quand la session est disponible en prop

```tsx
// MAUVAIS
function Layout({ children }) {
  const session = await auth() // Serveur fetch
  return (
    <div>
      <Topbar /> {/* ❌ useSession() refetch ici */}
      {children}
    </div>
  )
}
```

**Solution** : Passer la session via SessionProvider

```tsx
// BON
function Layout({ children }) {
  const session = await auth()
  return (
    <SessionProvider session={session}>
      <Topbar /> {/* ✅ Utilise session du provider */}
      {children}
    </SessionProvider>
  )
}
```

### ❌ 4. Pas de skeleton loaders

```tsx
// MAUVAIS
function UserMenu() {
  const { data: session } = useSession()

  // ❌ Rien pendant le chargement
  if (!session) return null

  return <div>{session.user.name}</div>
}
```

**Solution** : Toujours afficher un skeleton

```tsx
// BON
function UserMenu() {
  const { data: session, status } = useSession()

  if (status === 'loading') return <UserMenuSkeleton />

  return <div>{session.user.name}</div>
}
```

## Checklist Code Review Performance

Avant de merge une PR avec du code frontend, vérifier :

- [ ] Toutes les données fetchées ont des loading states
- [ ] Pas d'appels `useSession()` inutiles
- [ ] Les composants coûteux sont memoized (React.memo)
- [ ] Les images utilisent next/image
- [ ] Pas de console.log en production
- [ ] Score Lighthouse > 90 maintenu
- [ ] Pas de nouveau layout shift (CLS test)
- [ ] Requêtes API efficaces dans Network tab
- [ ] Pas de re-renders inutiles (React DevTools Profiler)

## Ressources

- [Next.js Performance Docs](https://nextjs.org/docs/app/building-your-application/optimizing)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Web Vitals](https://web.dev/vitals/)
