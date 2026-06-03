# Code Review Checklist - Frontend

Cette checklist doit être utilisée pour **toutes** les pull requests qui modifient du code frontend.

## ⚡ Performance (CRITIQUE)

### Skeleton Loaders

- [ ] Chaque composant qui charge des données a un skeleton loader
- [ ] Le skeleton match exactement la forme du composant final
- [ ] Testé avec throttled network (Chrome DevTools → Slow 3G)
- [ ] Aucun layout shift visible (CLS < 0.1)
- [ ] Animation respecte `prefers-reduced-motion`

**Comment tester** :

```bash
1. Chrome DevTools → Network
2. Sélectionner "Slow 3G"
3. Recharger la page
4. Vérifier que skeletons apparaissent immédiatement
5. Vérifier qu'il n'y a pas de "jump" quand le contenu charge
```

### Session Management

- [ ] Aucun appel `useSession()` inutile dans les composants
- [ ] Session passée du serveur au `SessionProvider` dans le layout
- [ ] Pas de fetch `/api/user/profile` pour obtenir nom/email (utiliser session)
- [ ] `auth()` utilisé côté serveur, `useSession()` côté client uniquement

**Red flags** :

```tsx
// ❌ MAUVAIS
const { data } = useSWR('/api/user/profile') // Pour obtenir le nom
const { data: session } = useSession()
const name = session.user.name // Devrait utiliser session directement
```

### Memoization

- [ ] Les composants coûteux sont wrappés avec `React.memo`
- [ ] Les calculs coûteux utilisent `useMemo`
- [ ] Les event handlers utilisent `useCallback`
- [ ] Pas de création d'objets/fonctions dans render sans memoization

**Exemples requis** :

```tsx
// ✅ BON
export const UserMenu = memo(function UserMenu() {
  const userName = useMemo(() => session?.user?.name, [session?.user?.name])
  const handleClick = useCallback(() => {}, [])
})
```

### Data Fetching

- [ ] Server Components utilisés par défaut (pas de 'use client' inutile)
- [ ] SWR configuré avec cache approprié (30-60s minimum)
- [ ] `revalidateOnFocus: false` et `revalidateOnReconnect: false` pour SWR
- [ ] Pas de fetches en cascade (fetcher en parallèle quand possible)
- [ ] ISR configuré pour Server Components (`export const revalidate`)

### Images

- [ ] Toutes les images utilisent `next/image`
- [ ] `priority` défini pour images above-the-fold
- [ ] `alt` text présent et descriptif
- [ ] `width` et `height` définis

## 🎨 UI/UX

### Loading States

- [ ] Skeleton loader pour chaque état de chargement
- [ ] Messages d'erreur clairs et actionnables
- [ ] Feedback visuel pour les actions (spinners, disabled states)
- [ ] Pas de "flash" de contenu non-authentifié

### Accessibility

- [ ] Boutons et liens ont des labels accessibles
- [ ] Contrastes de couleurs respectent WCAG 2.1 AA minimum
- [ ] Navigation au clavier fonctionne
- [ ] Textes d'erreur sont dans des régions ARIA appropriées

### Responsive

- [ ] Testé sur mobile (375px minimum)
- [ ] Testé sur tablette (768px)
- [ ] Testé sur desktop (1440px)
- [ ] Pas de scroll horizontal inattendu

## 🧹 Code Quality

### TypeScript

- [ ] Aucun `any` (utiliser des types spécifiques)
- [ ] Types importés depuis les bons endroits (`@/server/domains/*/types`)
- [ ] Props interfaces bien définies
- [ ] Pas de `// @ts-ignore` sans justification

### Naming Conventions

- [ ] Composants React en PascalCase (`UserMenu`, `DashboardCard`)
- [ ] Fonctions en camelCase (`handleClick`, `fetchUserData`)
- [ ] Constantes en SCREAMING_SNAKE_CASE (`API_BASE_URL`)
- [ ] Fichiers composants en PascalCase (`UserMenu.tsx`)
- [ ] Fichiers utils/hooks en kebab-case (`use-user-data.ts`)

### Imports

- [ ] Utilisation d'alias `@/*` pour tous les imports
- [ ] Imports groupés et triés (React → Next → Third-party → Local)
- [ ] Pas d'imports circulaires
- [ ] Imports non utilisés supprimés

**Exemple d'ordre** :

```tsx
// 1. React
import { memo, useMemo } from 'react'

// 2. Next.js
import { useRouter } from 'next/navigation'

// 3. Third-party
import { useSession } from 'next-auth/react'

// 4. UI components
import { Button } from '@/components/ui/button'

// 5. Local components
import { UserMenu } from '@/components/dashboard/topbar/userMenu'

// 6. Utils
import { cn } from '@/lib/utils'

// 7. Types
import type { User } from '@/server/domains/user/user.types'
```

### Comments

- [ ] Commenter uniquement ce qui n'est pas évident
- [ ] Pas de code commenté laissé en place
- [ ] TODOs avec contexte (`// TODO: Ajouter pagination quand API prête`)

## 🧪 Testing

### Manual Testing

- [ ] Page chargée avec cache vide (Hard Refresh)
- [ ] Page chargée avec cache (Normal Refresh)
- [ ] Navigation depuis d'autres pages
- [ ] Testé en mode dark et light
- [ ] Testé déconnecté (si applicable)

### Performance Testing

- [ ] Lighthouse audit exécuté
- [ ] Score Performance > 90
- [ ] CLS < 0.1
- [ ] LCP < 2.5s
- [ ] Onglet Network vérifié (pas de requêtes dupliquées)

**Comment tester** :

```bash
1. Chrome DevTools → Lighthouse
2. Mode: Navigation
3. Device: Desktop
4. Catégories: Performance
5. Click "Analyze page load"
6. Vérifier scores
```

## 🔒 Security

- [ ] Pas de données sensibles dans console.log
- [ ] Pas de clés API exposées côté client
- [ ] Inputs utilisateur validés (Zod schemas si applicable)
- [ ] XSS prévenu (dangerouslySetInnerHTML évité)

## 📦 Bundle Size

- [ ] Pas d'imports de librairies entières (`import _ from 'lodash'` → `import debounce from 'lodash/debounce'`)
- [ ] `'use client'` uniquement quand nécessaire
- [ ] Composants lourds en lazy loading si applicable

## ✅ Questions pour le Reviewer

Le PR doit répondre à ces questions :

1. **Pourquoi ce composant est client component ?**
   - Si `'use client'` présent, justifier pourquoi pas Server Component

2. **Où sont les skeletons ?**
   - Montrer les loading states pour chaque fetch de données

3. **Comment sont gérées les erreurs ?**
   - Montrer les error states et fallbacks UI

4. **Quelle est la stratégie de cache ?**
   - SWR : montrer `dedupingInterval` et autres options
   - Server : montrer `revalidate` config

5. **Layout shift mesuré ?**
   - Montrer screenshot Lighthouse CLS score

## 🚫 Blockers (PR ne peut pas merge si présent)

- ❌ Lighthouse Performance score < 85
- ❌ CLS > 0.15
- ❌ Composant chargeant données sans skeleton
- ❌ `any` TypeScript sans justification
- ❌ console.log en production
- ❌ Fetch `/api/user/profile` pour obtenir nom/email
- ❌ Code mort (fonctions/imports non utilisés)

## ✨ Nice to Have (Bonus points)

- ⭐ Transitions smooth avec framer-motion
- ⭐ Progressive enhancement (fonctionne sans JS)
- ⭐ Tests unitaires ajoutés
- ⭐ Storybook story créée
- ⭐ Documentation mise à jour

## 📋 Template Commentaire Review

Copier/coller ce template pour vos reviews :

```markdown
## Performance

- [ ] Skeleton loaders présents et testés
- [ ] Session management correct
- [ ] Memoization appropriée
- [ ] Data fetching optimal

## Tests

- [ ] Lighthouse Score: [X]/100
- [ ] CLS: [X.XX]
- [ ] Network tab vérifié

## Observations

[Vos commentaires ici]

## Blockers

[Liste des blockers si présents]

## Approved ✅ / Changes Requested ❌
```

## 🎯 TL;DR - Quick Check

**Les 5 choses à vérifier en priorité** :

1. ✅ Skeleton loaders partout où il y a du loading
2. ✅ Pas de `useSession()` dans 10 composants différents
3. ✅ React.memo sur composants qui re-render souvent
4. ✅ Lighthouse > 90
5. ✅ Aucun console.log oublié

Si ces 5 points sont OK, le reste suivra généralement.

---

**Dernière mise à jour** : Mars 2026
**Maintenu par** : Frontend Team
