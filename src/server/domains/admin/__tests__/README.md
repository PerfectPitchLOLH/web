# Admin Domain Tests

Tests complets pour le domaine Admin suivant l'approche TDD (Test-Driven Development).

## Couverture des tests

### admin.repository.test.ts (14 tests)

Tests de la couche d'accès aux données (Repository):

- **getUserStats**: Récupération des statistiques utilisateurs
- **getSystemStats**: Récupération des statistiques système
- **getUsersWithFilters**:
  - Pagination des utilisateurs
  - Filtrage par rôle
  - Recherche par email/nom
  - Filtrage par statut de vérification email
- **getUserById**: Récupération d'un utilisateur par ID (cas succès et non trouvé)
- **updateUserRole**: Mise à jour du rôle utilisateur
- **createAuditLog**: Création d'un log d'audit
- **getAuditLogs**:
  - Pagination des logs
  - Filtrage par userId
  - Filtrage par action
  - Filtrage par plage de dates

### admin.service.test.ts (10 tests)

Tests de la couche métier (Service):

- **getDashboardStats**:
  - Récupération complète des stats
  - Appels parallèles aux repositories
- **getUsers**: Application des filtres utilisateurs
- **updateUserRole**:
  - Mise à jour réussie avec création de log d'audit
  - Erreur NOT_FOUND si utilisateur inexistant
  - Erreur FORBIDDEN si admin essaie de changer son propre rôle
  - Création de log d'audit après mise à jour
- **getAuditLogs**: Récupération avec filtres
- **logAdminAction**:
  - Création de log avec données complètes
  - Gestion des valeurs null (IP, user agent)

### admin.schemas.test.ts (28 tests)

Tests de validation des schémas Zod:

- **updateUserRoleSchema**:
  - Validation des données correctes (admin/user)
  - Rejet userId vide ou manquant
  - Rejet rôle invalide ou manquant

- **userManagementFiltersSchema**:
  - Validation avec tous les champs
  - Tous les champs optionnels
  - Filtres individuels (role, search)
  - Transformation emailVerified (string → boolean)
  - Coercition page et limit (string → number)
  - Validation des limites (page ≥ 1, 1 ≤ limit ≤ 100)
  - Rejet des rôles invalides

- **auditLogFiltersSchema**:
  - Validation avec tous les champs
  - Tous les champs optionnels
  - Coercition des dates (string → Date)
  - Coercition page et limit
  - Validation des limites (page ≥ 1, 1 ≤ limit ≤ 100)
  - Filtres individuels (userId, action)

## Résultats

```
✓ admin.repository.test.ts (14 tests) 33ms
✓ admin.schemas.test.ts (28 tests) 69ms
✓ admin.service.test.ts (10 tests) 42ms

Total: 52 tests passés ✅
```

## Exécution des tests

```bash
# Tous les tests du domaine admin
npm test -- src/server/domains/admin/__tests__

# Fichier spécifique
npm test -- src/server/domains/admin/__tests__/admin.service.test.ts

# Mode watch
npm run test:watch -- src/server/domains/admin/__tests__
```

## Bonnes pratiques appliquées

1. **Isolation**: Chaque test est isolé via `beforeEach` et `vi.clearAllMocks()`
2. **Mocking**: Utilisation de mocks pour les dépendances externes (database, repositories)
3. **Coverage**: Tests des cas de succès ET d'erreur
4. **Assertions claires**: Vérification des appels de fonctions et des valeurs retournées
5. **Types**: TypeScript pour la sécurité des types dans les tests
6. **Organisation**: Structure claire par describe/it avec descriptions explicites

## Architecture testée

```
Controller → Service → Repository → Database
    ↓         ↓           ↓
  Tests    Tests       Tests
```

Les tests valident chaque couche de manière isolée pour garantir la fiabilité du domaine Admin.
