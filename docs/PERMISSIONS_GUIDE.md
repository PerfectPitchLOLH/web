# Guide du Système de Permissions

Ce guide explique comment utiliser le système de permissions pour contrôler l'accès aux fonctionnalités selon le plan d'abonnement de l'utilisateur.

## Vue d'ensemble

Le système de permissions permet de :

- Définir quelles features sont disponibles par plan (free, junior, basic, pro)
- Protéger les API routes avec des guards automatiques
- Afficher conditionnellement les composants UI selon le plan
- Proposer des upgrades automatiques

## Configuration des Features

Les features sont définies dans `/src/server/domains/permission/permission.constants.ts` :

```typescript
const PRO_FEATURES: FeatureLimits = {
  transcription: { enabled: true, limit: 50, unit: 'minutes' },
  sheet_editor: { enabled: true },
  export_pdf: { enabled: true },
  collaboration: { enabled: true, limit: 5, unit: 'users' },
  // ...
}
```

### Features Disponibles

- `transcription` : Transcription audio vers partition
- `falling_notes` : Visualisation notes tombantes
- `history_access` : Accès à l'historique
- `sheet_editor` : Éditeur de partitions avancé
- `polyphony` : Support polyphonique
- `export_pdf` : Export au format PDF
- `export_midi` : Export au format MIDI
- `export_musicxml` : Export au format MusicXML
- `ai_recommendations` : Recommandations IA
- `collaboration` : Partage et collaboration
- `api_access` : Accès API développeur
- `priority_support` : Support prioritaire
- `custom_branding` : Branding personnalisé

## Utilisation Backend (API Routes)

### Protéger une route avec `withFeatureGuard`

```typescript
// /src/app/api/transcription/route.ts
import { withFeatureGuard } from '@/server/shared/middleware/feature-guard.middleware'
import { createSuccessResponse } from '@/server/shared/utils/api.utils'

export const POST = withFeatureGuard(
  'transcription',
  async (request, userId) => {
    // Votre logique ici
    // userId est automatiquement fourni par le guard

    return createSuccessResponse({ success: true })
  },
  {
    // Optionnel : vérifier l'usage actuel
    getCurrentUsage: async (userId) => {
      const credits = await db.userCredits.findUnique({
        where: { userId },
      })
      return credits?.usedThisMonth || 0
    },
    customErrorMessage: 'Limite de transcription mensuelle atteinte',
  },
)
```

### Vérifier manuellement une permission

```typescript
import { permissionService } from '@/server/domains/permission'

const result = await permissionService.checkFeatureAccessForUser(
  userId,
  'sheet_editor',
)

if (!result.hasAccess) {
  console.log(result.reason) // "Fonctionnalité non disponible sur le plan Free"
  console.log(result.upgradeRequired) // "basic"
}
```

### Vérifier un abonnement actif

```typescript
import { requireActiveSubscription } from '@/server/shared/middleware/subscription.middleware'

export async function POST(request: NextRequest) {
  const error = await requireActiveSubscription(request)
  if (error) return error

  // L'utilisateur a un abonnement actif
}
```

## Utilisation Frontend (React)

### Composant `FeatureGate`

Affiche conditionnellement du contenu selon l'accès à une feature :

```tsx
import { FeatureGate } from '@/components/permissions/FeatureGate'

export function MyComponent() {
  return (
    <FeatureGate feature="sheet_editor" showUpgradePrompt={true}>
      <SheetEditor />
    </FeatureGate>
  )
}
```

Si l'utilisateur n'a pas accès, un prompt d'upgrade s'affiche automatiquement.

### Hook `useHasFeature`

Vérifier l'accès à une feature dans un composant :

```tsx
'use client'

import { useHasFeature } from '@/hooks/permissions/useHasFeature'

export function ExportButtons() {
  const { hasAccess: canExportPDF, isLoading } = useHasFeature('export_pdf')

  if (isLoading) return <Spinner />

  return (
    <div>
      <Button>Export MIDI</Button>
      {canExportPDF && <Button>Export PDF</Button>}
    </div>
  )
}
```

### Hook `useSubscription`

Obtenir les informations sur l'abonnement :

```tsx
'use client'

import { useSubscription } from '@/hooks/permissions/useSubscription'

export function SubscriptionInfo() {
  const {
    planTier, // 'free' | 'junior' | 'basic' | 'pro'
    hasActiveSubscription,
    isTrialing,
    isCanceled,
    isLoading,
  } = useSubscription()

  if (isLoading) return <Spinner />

  return (
    <div>
      <h2>Plan actuel : {planTier}</h2>
      {isTrialing && <Badge>Essai gratuit</Badge>}
      {isCanceled && <Alert>Abonnement annulé</Alert>}
    </div>
  )
}
```

### Hook `useFeatureGate`

Combinaison de `useHasFeature` + `useSubscription` :

```tsx
'use client'

import { useFeatureGate } from '@/hooks/permissions/useFeatureGate'

export function PremiumFeature() {
  const { canAccess, upgradeRequired, currentPlan, reason } =
    useFeatureGate('collaboration')

  if (!canAccess) {
    return (
      <Alert>
        {reason}
        <Button>Passer au plan {upgradeRequired}</Button>
      </Alert>
    )
  }

  return <CollaborationPanel />
}
```

## Composants Utilitaires

### `PlanBadge`

Affiche un badge avec le plan actuel :

```tsx
import { PlanBadge } from '@/components/permissions/PlanBadge'
;<PlanBadge /> // Affiche "Pro", "Basic (Essai)", etc.
```

### `UpgradePrompt`

Prompt d'upgrade avec CTA vers la page subscription :

```tsx
import { UpgradePrompt } from '@/components/permissions/UpgradePrompt'
;<UpgradePrompt
  targetPlan="pro"
  reason="Cette fonctionnalité nécessite un plan Pro"
/>
```

## API Routes Disponibles

### `GET /api/permissions/context`

Récupère le contexte de permission de l'utilisateur :

```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "planTier": "basic",
    "subscriptionStatus": "active",
    "isTrialing": false,
    "isCanceled": false
  }
}
```

### `GET /api/permissions/check?feature=export_pdf&usage=5`

Vérifie l'accès à une feature spécifique :

```json
{
  "success": true,
  "data": {
    "hasAccess": true,
    "currentLimit": 20,
    "usedLimit": 5
  }
}
```

### `GET /api/permissions/features`

Liste toutes les features disponibles pour l'utilisateur :

```json
{
  "success": true,
  "data": {
    "transcription": true,
    "sheet_editor": false,
    "export_pdf": true,
    ...
  }
}
```

## Exemples de Scénarios

### Scénario 1 : Protéger une page entière

```tsx
// /app/dashboard/editor/page.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/server/lib/auth'
import { permissionService } from '@/server/domains/permission'

export default async function EditorPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')

  const result = await permissionService.checkFeatureAccessForUser(
    session.user.id,
    'sheet_editor',
  )

  if (!result.hasAccess) {
    return (
      <UpgradePrompt
        targetPlan={result.upgradeRequired!}
        reason={result.reason}
      />
    )
  }

  return <SheetEditor />
}
```

### Scénario 2 : Affichage conditionnel multiple

```tsx
'use client'

export function FeatureList() {
  const { hasAccess: canEdit } = useHasFeature('sheet_editor')
  const { hasAccess: canCollaborate } = useHasFeature('collaboration')
  const { hasAccess: canExportPDF } = useHasFeature('export_pdf')

  return (
    <ul>
      <li>✅ Transcription audio</li>
      <li>✅ Notes tombantes</li>
      {canEdit && <li>✅ Éditeur de partitions</li>}
      {canCollaborate && <li>✅ Collaboration</li>}
      {canExportPDF && <li>✅ Export PDF</li>}
    </ul>
  )
}
```

### Scénario 3 : API protégée avec usage

```typescript
// /src/app/api/export/pdf/route.ts
import { withFeatureGuard } from '@/server/shared/middleware/feature-guard.middleware'
import { db } from '@/server/lib/database'

export const POST = withFeatureGuard(
  'export_pdf',
  async (request, userId) => {
    // Logique d'export PDF
    const pdf = await generatePDF(userId)

    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="partition.pdf"',
      },
    })
  },
  {
    getCurrentUsage: async (userId) => {
      // Vérifier combien d'exports ce mois
      const count = await db.exportLog.count({
        where: {
          userId,
          type: 'pdf',
          createdAt: { gte: startOfMonth() },
        },
      })
      return count
    },
  },
)
```

## Ajouter une Nouvelle Feature

1. **Ajouter le type** dans `permission.types.ts` :

```typescript
export type FeatureKey = 'transcription' | 'my_new_feature' // ← Ajouter ici
```

2. **Configurer par plan** dans `permission.constants.ts` :

```typescript
const PRO_FEATURES: FeatureLimits = {
  // ...
  my_new_feature: { enabled: true, limit: 10, unit: 'files' },
}

const BASIC_FEATURES: FeatureLimits = {
  // ...
  my_new_feature: { enabled: false },
}
```

3. **Ajouter le nom d'affichage** :

```typescript
export const FEATURE_DISPLAY_NAMES = {
  // ...
  my_new_feature: 'Ma nouvelle fonctionnalité',
}
```

4. **Utiliser** dans votre code :

```tsx
<FeatureGate feature="my_new_feature">
  <MyNewComponent />
</FeatureGate>
```

## Bonnes Pratiques

1. **Toujours vérifier côté serveur** : Les guards frontend sont pour l'UX, la sécurité est côté backend
2. **Messages clairs** : Utilisez `customErrorMessage` pour guider l'utilisateur
3. **Gestion du loading** : Affichez un état de chargement pendant la vérification
4. **Fallback approprié** : Prévoyez toujours un fallback pour les utilisateurs sans accès
5. **Upgrade prompts** : Montrez toujours comment débloquer la fonctionnalité

## Résumé

Le système de permissions offre :

- ✅ Configuration centralisée par plan
- ✅ Guards automatiques pour les API
- ✅ Composants React ready-to-use
- ✅ Hooks pour vérifications custom
- ✅ Prompts d'upgrade automatiques
- ✅ Type-safe (TypeScript)
