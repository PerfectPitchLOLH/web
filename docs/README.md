# Documentation Notavex

Bienvenue dans la documentation technique de Notavex !

## 📚 Table des Matières

### Frontend

- **[Performance Guidelines](./frontend/PERFORMANCE.md)** - Règles et best practices pour optimiser les performances
- **[Skeleton Loaders](./frontend/SKELETON_LOADERS.md)** - Guide complet pour créer des skeleton loaders
- **[Data Fetching](./frontend/DATA_FETCHING.md)** - Stratégies de récupération de données (Server Components, SWR, Session)
- **[Code Review Checklist](./frontend/CODE_REVIEW_CHECKLIST.md)** - Checklist obligatoire pour toutes les PR frontend

### Architecture

- **[CLAUDE.md (racine)](../CLAUDE.md)** - Architecture globale du projet, conventions de nommage, structure

## 🎯 Quick Start

### Pour les Nouveaux Développeurs

1. Lire [CLAUDE.md](../CLAUDE.md) pour comprendre l'architecture globale
2. Lire [Performance Guidelines](./frontend/PERFORMANCE.md) pour les règles de performance
3. Consulter [Code Review Checklist](./frontend/CODE_REVIEW_CHECKLIST.md) avant chaque PR

### Pour Ajouter une Nouvelle Feature

1. **Conception** : Lire [Data Fetching](./frontend/DATA_FETCHING.md) pour choisir la bonne approche
2. **Développement** : Suivre [Performance Guidelines](./frontend/PERFORMANCE.md)
3. **Loading States** : Créer les skeletons selon [Skeleton Loaders](./frontend/SKELETON_LOADERS.md)
4. **Review** : Utiliser [Code Review Checklist](./frontend/CODE_REVIEW_CHECKLIST.md)

## 🔑 Concepts Clés

### Architecture Frontend

Notre stack frontend suit ces principes :

- **Server-First** : Server Components par défaut, Client Components uniquement si nécessaire
- **Performance** : Lighthouse > 90, CLS < 0.1, pas de layout shift
- **UX** : Skeleton loaders obligatoires pour tous les loading states
- **Caching** : Session pour données utilisateur, SWR pour données dynamiques, ISR pour données statiques

### Stack Technique

- **Framework** : Next.js 16 avec App Router
- **UI** : React 19, Tailwind CSS v4, shadcn/ui
- **Auth** : NextAuth.js v5 (JWT sessions)
- **Data Fetching** : Server Components + SWR
- **Language** : TypeScript 5

## 📖 Guides par Cas d'Usage

### Afficher des Données Utilisateur

```tsx
// ✅ Utiliser la session (pas de fetch)
import { useSession } from 'next-auth/react'

function UserProfile() {
  const { data: session } = useSession()
  return <div>{session.user.name}</div>
}
```

**Voir** : [Data Fetching - Session Data](./frontend/DATA_FETCHING.md#2-session-data-le-plus-rapide)

### Créer un Nouveau Composant avec Loading

```tsx
// 1. Créer le skeleton
function MyComponentSkeleton() {
  return <Skeleton className="h-20 w-full" />
}

// 2. Utiliser dans le composant
function MyComponent() {
  const { data, isLoading } = useSWR('/api/data')

  if (isLoading) return <MyComponentSkeleton />
  return <div>{data.content}</div>
}
```

**Voir** : [Skeleton Loaders - Créer un Skeleton](./frontend/SKELETON_LOADERS.md#créer-un-skeleton-loader)

### Optimiser un Composant qui Re-render Trop

```tsx
import { memo, useMemo, useCallback } from 'react'

export const MyComponent = memo(function MyComponent({ data }) {
  const processedData = useMemo(() => expensiveOperation(data), [data])
  const handleClick = useCallback(() => {}, [])

  return <div onClick={handleClick}>{processedData}</div>
})
```

**Voir** : [Performance - Memoization](./frontend/PERFORMANCE.md#2-éliminer-les-re-renders-inutiles)

## 🛠 Outils de Développement

### Performance Testing

```bash
# Lighthouse Audit
Chrome DevTools → Lighthouse → Analyze page load

# Network Throttling
Chrome DevTools → Network → Slow 3G

# React Profiler
React DevTools → Profiler → Record
```

### Code Quality

```bash
# Lint
npm run lint

# Type Check
npm run type-check

# Build
npm run build
```

## ⚠️ Règles Critiques

### ❌ À NE JAMAIS FAIRE

1. Fetcher `/api/user/profile` pour obtenir nom/email (utiliser session)
2. Créer un composant sans skeleton loader
3. Utiliser `useSession()` dans un Server Component
4. Oublier React.memo sur composants qui re-render souvent
5. Laisser des console.log en production

### ✅ À TOUJOURS FAIRE

1. Skeleton loader pour chaque loading state
2. Server Component par défaut, Client uniquement si nécessaire
3. Passer session du serveur au SessionProvider
4. Tester avec Lighthouse (score > 90)
5. Suivre la Code Review Checklist

## 📊 Métriques de Performance

### Targets

| Métrique               | Target | Actuel    |
| ---------------------- | ------ | --------- |
| Lighthouse Performance | > 90   | 90-95     |
| CLS                    | < 0.1  | < 0.1     |
| LCP                    | < 2.5s | 1.5-2.5s  |
| Time to Interactive    | < 1s   | 400-700ms |

### Comment Mesurer

```bash
1. Chrome DevTools → Lighthouse
2. Mode: Navigation, Device: Desktop
3. Category: Performance
4. Click "Analyze page load"
```

## 🔄 Workflow de Développement

### 1. Avant de Commencer

- [ ] Lire la documentation pertinente
- [ ] Comprendre l'architecture existante
- [ ] Choisir la bonne approche (Server/Client Component)

### 2. Pendant le Développement

- [ ] Créer les skeletons en même temps que les composants
- [ ] Tester avec throttled network régulièrement
- [ ] Utiliser React.memo/useMemo/useCallback quand approprié

### 3. Avant la PR

- [ ] Lighthouse audit (> 90)
- [ ] Vérifier Code Review Checklist
- [ ] Tester dark/light mode
- [ ] Tester responsive (mobile, tablet, desktop)

### 4. Pendant la Review

- [ ] Répondre aux questions de la checklist
- [ ] Justifier les choix techniques
- [ ] Montrer les métriques de performance

## 🆘 Aide et Support

### Questions Fréquentes

**Q: Quand utiliser un Server Component vs Client Component ?**
A: Server Component par défaut. Client uniquement si besoin d'interactivité (hooks, event handlers, etc.). Voir [Data Fetching](./frontend/DATA_FETCHING.md).

**Q: Comment éviter le layout shift ?**
A: Utiliser des skeleton loaders qui matchent exactement la forme du contenu final. Voir [Skeleton Loaders](./frontend/SKELETON_LOADERS.md).

**Q: SWR ou Server Component pour fetcher des données ?**
A: Server Component pour données statiques/rarement mises à jour. SWR pour données dynamiques/fréquemment mises à jour. Voir [Data Fetching](./frontend/DATA_FETCHING.md).

### Ressources Externes

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [SWR Documentation](https://swr.vercel.app)
- [Web Vitals](https://web.dev/vitals/)
- [shadcn/ui](https://ui.shadcn.com/)

## 📝 Contribuer à la Documentation

Si vous trouvez une erreur ou souhaitez améliorer la documentation :

1. Créer une branche : `git checkout -b docs/improve-performance-guide`
2. Modifier les fichiers dans `/docs`
3. Créer une PR avec le label `documentation`

## 🏗 Structure du Projet

```
docs/
├── README.md                              # Ce fichier
└── frontend/
    ├── PERFORMANCE.md                     # Guidelines performance
    ├── SKELETON_LOADERS.md                # Guide skeleton loaders
    ├── DATA_FETCHING.md                   # Stratégies data fetching
    └── CODE_REVIEW_CHECKLIST.md           # Checklist PR
```

---

**Dernière mise à jour** : Mars 2026
**Maintenu par** : Équipe Notavex

Pour toute question, consulter les guides ci-dessus ou demander en code review.
