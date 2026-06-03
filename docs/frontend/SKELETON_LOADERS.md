# Guide des Skeleton Loaders

## Pourquoi les Skeleton Loaders ?

Les skeleton loaders améliorent l'expérience utilisateur en :

- **Réduisant le layout shift** (CLS < 0.1)
- **Donnant un feedback immédiat** à l'utilisateur
- **Créant une perception de rapidité** même si le chargement prend du temps
- **Maintenant la structure visuelle** pendant le chargement

## Principe de Base

**Règle d'or** : Le skeleton doit **matcher exactement** la forme du composant final.

```tsx
// ✅ BON - Skeleton match le composant
<div className="flex items-center gap-2">
  <Skeleton variant="circular" className="size-10" />
  <div className="space-y-2">
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-3 w-40" />
  </div>
</div>

// Devient...
<div className="flex items-center gap-2">
  <Avatar className="size-10">
    <AvatarImage src={user.image} />
  </Avatar>
  <div className="space-y-2">
    <p className="h-4 text-sm">{user.name}</p>
    <p className="h-3 text-xs">{user.email}</p>
  </div>
</div>
```

## Composants Skeleton Disponibles

### 1. Skeleton de Base

```tsx
import { Skeleton } from '@/components/ui/skeleton'

// Variants disponibles
<Skeleton variant="default" />     // Rectangulaire (défaut)
<Skeleton variant="circular" />    // Circulaire (avatars)
<Skeleton variant="text" />        // Texte (coins arrondis subtils)
<Skeleton variant="rectangle" />   // Rectangle (rounded-lg)
<Skeleton variant="shimmer" />     // Avec effet shimmer
```

### 2. Skeleton Variants Composés

```tsx
import {
  AvatarSkeleton,
  TextSkeleton,
  CardSkeleton,
  UserMenuTriggerSkeleton,
  UserMenuDropdownSkeleton,
} from '@/components/ui/skeleton-variants'

// Avatar skeleton (sm, md, lg)
<AvatarSkeleton size="md" />

// Text skeleton (lignes multiples)
<TextSkeleton lines={3} />

// Card skeleton complet
<CardSkeleton />
```

## Créer un Skeleton Loader

### Étape 1 : Analyser le Composant Final

```tsx
// Composant final
function UserCard({ user }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center gap-4">
        <Avatar className="size-12">
          <AvatarImage src={user.image} />
        </Avatar>
        <div>
          <h3 className="font-semibold">{user.name}</h3>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <p className="mt-4 text-sm">{user.bio}</p>
      <Button className="mt-4 w-full">Voir le profil</Button>
    </div>
  )
}
```

### Étape 2 : Mesurer les Dimensions

| Élément   | Classes                 | Dimensions     |
| --------- | ----------------------- | -------------- |
| Container | `rounded-lg border p-6` | Auto × Auto    |
| Avatar    | `size-12`               | 48px × 48px    |
| Name      | `font-semibold`         | h-5 (20px)     |
| Email     | `text-sm`               | h-4 (16px)     |
| Bio       | `text-sm`               | h-4 × 2 lignes |
| Button    | `h-10 w-full`           | 40px × 100%    |

### Étape 3 : Créer le Skeleton

```tsx
function UserCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" className="size-12" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="mt-4 h-10 w-full rounded-md" />
    </div>
  )
}
```

### Étape 4 : Intégrer le Loading State

```tsx
function UserCard({ userId }) {
  const { data: user, isLoading } = useSWR(`/api/users/${userId}`)

  if (isLoading) return <UserCardSkeleton />

  return <div className="rounded-lg border bg-card p-6">{/* ... */}</div>
}
```

## Exemples par Type de Composant

### Avatar + Nom

```tsx
// Skeleton
<div className="flex items-center gap-2">
  <Skeleton variant="circular" className="size-10" />
  <Skeleton className="h-4 w-24" />
</div>

// Réel
<div className="flex items-center gap-2">
  <Avatar className="size-10">
    <AvatarImage src={user.image} />
  </Avatar>
  <span>{user.name}</span>
</div>
```

### Card de Contenu

```tsx
// Skeleton
<div className="space-y-3 rounded-lg border bg-card p-6">
  <Skeleton className="h-6 w-40" />
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-5/6" />
  <Skeleton className="mt-4 h-10 w-32" />
</div>

// Réel
<div className="space-y-3 rounded-lg border bg-card p-6">
  <h3 className="text-lg font-semibold">{title}</h3>
  <p className="text-sm">{description}</p>
  <Button>En savoir plus</Button>
</div>
```

### Liste d'Items

```tsx
// Skeleton
<div className="space-y-3">
  {Array.from({ length: 5 }).map((_, i) => (
    <div key={i} className="flex items-center gap-3">
      <Skeleton variant="circular" className="size-8" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  ))}
</div>

// Réel
<div className="space-y-3">
  {items.map((item) => (
    <div key={item.id} className="flex items-center gap-3">
      <Avatar className="size-8">
        <AvatarImage src={item.image} />
      </Avatar>
      <div>
        <p className="text-sm font-medium">{item.title}</p>
        <p className="text-xs text-muted-foreground">{item.subtitle}</p>
      </div>
    </div>
  ))}
</div>
```

### Formulaire

```tsx
// Skeleton
<div className="space-y-4">
  <div className="space-y-2">
    <Skeleton className="h-4 w-20" />
    <Skeleton className="h-10 w-full rounded-md" />
  </div>
  <div className="space-y-2">
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-10 w-full rounded-md" />
  </div>
  <Skeleton className="h-10 w-full rounded-md" />
</div>

// Réel
<form className="space-y-4">
  <div className="space-y-2">
    <Label>Nom</Label>
    <Input value={name} />
  </div>
  <div className="space-y-2">
    <Label>Email</Label>
    <Input value={email} />
  </div>
  <Button type="submit">Enregistrer</Button>
</form>
```

## Best Practices

### 1. Préserver le Layout

```tsx
// ✅ BON - Hauteur minimale préservée
<div className="min-h-[200px]">
  {isLoading ? <Skeleton className="h-full" /> : <Content />}
</div>

// ❌ MAUVAIS - Layout shift quand le contenu charge
<div>
  {isLoading ? <Skeleton className="h-10" /> : <Content />}
</div>
```

### 2. Animation Respectueuse

Notre skeleton supporte automatiquement `prefers-reduced-motion` :

```tsx
// Classes automatiques dans skeleton.tsx
className={cn(
  'motion-safe:animate-pulse',      // Anime si allowed
  'motion-reduce:animate-none',     // Pas d'animation si reduced-motion
  className
)}
```

### 3. Nombre d'Éléments

```tsx
// ✅ BON - Nombre réaliste d'items
{
  Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
}

// ❌ MAUVAIS - Trop d'items skeleton
{
  Array.from({ length: 20 }).map((_, i) => <CardSkeleton key={i} />)
}
```

### 4. Transitions Smoothes

Ajouter une transition fade-in après le chargement :

```tsx
import { motion } from 'framer-motion'

function Component() {
  const { data, isLoading } = useSWR('/api/data')

  if (isLoading) return <Skeleton />

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {data.content}
    </motion.div>
  )
}
```

## Tester les Skeletons

### Chrome DevTools Network Throttling

1. Ouvrir DevTools (F12)
2. Aller dans l'onglet Network
3. Sélectionner "Slow 3G" dans le dropdown
4. Recharger la page
5. Vérifier que les skeletons s'affichent correctement

### Lighthouse CLS Test

```bash
# Run Lighthouse audit
1. DevTools → Lighthouse
2. Cocher "Performance"
3. Click "Analyze page load"
4. Vérifier CLS < 0.1
```

## Checklist Skeleton Loader

Avant de considérer un skeleton loader comme terminé :

- [ ] Les dimensions matchent exactement le composant final
- [ ] Aucun layout shift visible (CLS < 0.1)
- [ ] Animation respecte prefers-reduced-motion
- [ ] Testé avec throttled network (Slow 3G)
- [ ] Nombre d'éléments réaliste
- [ ] Transition smooth vers le contenu réel
- [ ] Code propre et réutilisable

## Ressources

- [Skeleton UI Patterns](https://www.nngroup.com/articles/skeleton-screens/)
- [Cumulative Layout Shift](https://web.dev/cls/)
- [Reduced Motion](https://web.dev/prefers-reduced-motion/)
