# Dashboard Administrateur - Documentation

## 📋 Vue d'ensemble

Le dashboard administrateur de Notavex est une interface complète et sécurisée permettant aux administrateurs de gérer la plateforme, surveiller les utilisateurs et analyser les performances système.

## 🎯 Fonctionnalités

### 1. Analytics Dashboard (`/admin`)

- **Statistiques utilisateurs**:
  - Total utilisateurs
  - Utilisateurs actifs (email vérifié)
  - Nouveaux utilisateurs (jour/semaine/mois)
  - Répartition par rôle

- **Métriques système**:
  - Uptime du serveur
  - Total d'appels API
  - Taux d'erreur
  - Temps de réponse moyen

### 2. Gestion des Utilisateurs (`/admin/users`)

- **Liste des utilisateurs**:
  - Pagination (10 utilisateurs/page)
  - Recherche par nom ou email
  - Filtrage par rôle
  - Filtrage par statut de vérification

- **Actions disponibles**:
  - Modifier le rôle d'un utilisateur (admin/user/guest)
  - Voir les informations détaillées
  - Historique d'audit automatique

### 3. Logs d'Audit (`/admin/audit-logs`)

- **Historique complet**:
  - Toutes les actions administratives
  - Modifications de rôles
  - Tentatives d'accès non autorisées
  - Date, heure, utilisateur, IP

- **Fonctionnalités**:
  - Pagination (20 logs/page)
  - Filtrage par utilisateur
  - Filtrage par type d'action
  - Filtrage par période

### 4. Monitoring Système (`/admin/system`)

- **Santé du système**:
  - Status de l'API
  - Connexion base de données
  - Services d'authentification
  - Cache et CDN

- **Performance**:
  - Taux de réussite des requêtes
  - Distribution des erreurs
  - Métriques en temps réel

## 🔐 Sécurité

### Authentification Multi-Niveaux

1. **Layout Server-Side**: Vérifie le rôle avant de charger la page
2. **API Controllers**: Vérifie le rôle à chaque requête
3. **Audit Logging**: Enregistre toutes les tentatives d'accès

### Protection RBAC

- Seuls les utilisateurs avec `role: 'admin'` peuvent accéder
- Redirection automatique vers `/dashboard` si non-autorisé
- Logs d'audit pour toute tentative d'accès non autorisée

### Traçabilité

Chaque action admin est enregistrée avec:

- ID et nom de l'utilisateur
- Action effectuée
- Ressource affectée
- Détails de la modification
- Adresse IP
- User agent
- Timestamp

## 🚀 Utilisation

### Accès au Dashboard

1. Se connecter avec un compte admin
2. Cliquer sur le menu utilisateur (en haut à droite)
3. Cliquer sur "Admin Panel" (bouclier rouge)

### Modifier un Rôle Utilisateur

1. Aller dans `/admin/users`
2. Rechercher l'utilisateur (optionnel)
3. Sélectionner le nouveau rôle dans le dropdown
4. La modification est immédiate et logged

### Consulter les Logs

1. Aller dans `/admin/audit-logs`
2. Utiliser les filtres pour affiner la recherche
3. Naviguer entre les pages

## 🏗️ Architecture Technique

### Backend (Domain-Driven Design)

```
src/server/domains/admin/
├── admin.types.ts         # Types TypeScript
├── admin.schemas.ts       # Validation Zod
├── admin.repository.ts    # Accès aux données
├── admin.service.ts       # Logique métier
├── admin.controller.ts    # Handlers HTTP
└── index.ts               # Exports + singletons
```

### API Routes

```
src/app/api/admin/
├── stats/route.ts         # GET /api/admin/stats
├── users/
│   ├── route.ts           # GET /api/admin/users
│   └── role/route.ts      # PATCH /api/admin/users/role
└── audit-logs/route.ts    # GET /api/admin/audit-logs
```

### Frontend (Performance Optimisée)

```
src/app/admin/
├── layout.tsx             # Layout avec sidebar + auth check
├── page.tsx               # Analytics dashboard
├── users/page.tsx         # Gestion utilisateurs
├── audit-logs/page.tsx    # Logs d'audit
└── system/page.tsx        # Monitoring système
```

### Base de Données (Prisma)

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  userName  String
  action    String
  resource  String
  details   String?
  ipAddress String?
  userAgent String?
  timestamp DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([timestamp])
}
```

## 📊 API Endpoints

### GET `/api/admin/stats`

Récupère les statistiques du dashboard

**Response:**

```json
{
  "success": true,
  "data": {
    "users": {
      "totalUsers": 1250,
      "activeUsers": 980,
      "newUsersToday": 12,
      "newUsersThisWeek": 45,
      "newUsersThisMonth": 189,
      "usersByRole": {
        "admin": 3,
        "user": 1200,
        "guest": 47
      }
    },
    "system": {
      "uptime": 86400,
      "totalApiCalls": 50000,
      "failedApiCalls": 123,
      "errorRate": 0.25,
      "averageResponseTime": 45
    }
  }
}
```

### GET `/api/admin/users`

Liste les utilisateurs avec filtres

**Query Parameters:**

- `page`: Numéro de page (défaut: 1)
- `limit`: Nombre par page (défaut: 10, max: 100)
- `role`: Filtrer par rôle (admin/user/guest)
- `search`: Recherche par nom ou email
- `emailVerified`: true/false

**Response:**

```json
{
  "success": true,
  "data": {
    "users": [...],
    "total": 1250,
    "page": 1,
    "limit": 10,
    "totalPages": 125
  }
}
```

### PATCH `/api/admin/users/role`

Modifie le rôle d'un utilisateur

**Body:**

```json
{
  "userId": "user_123",
  "role": "admin"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "User role updated successfully"
  }
}
```

### GET `/api/admin/audit-logs`

Récupère les logs d'audit

**Query Parameters:**

- `page`: Numéro de page (défaut: 1)
- `limit`: Nombre par page (défaut: 20, max: 100)
- `userId`: Filtrer par utilisateur
- `action`: Filtrer par action
- `startDate`: Date début (ISO 8601)
- `endDate`: Date fin (ISO 8601)

## 🎨 UI/UX

### Design System

- **Composants**: shadcn/ui (New York style)
- **Icons**: Lucide React
- **Couleurs**: Neutral palette
- **Mode**: Dark mode par défaut

### Performance

- **Server Components**: Par défaut pour les pages
- **Client Components**: Uniquement pour l'interactivité
- **Streaming**: Chargement progressif
- **Skeletons**: États de chargement optimisés

### Responsive

- Mobile-first design
- Sidebar collapsible sur mobile
- Tables scrollables horizontalement

## 🔧 Configuration

### Variables d'Environnement

```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Créer un Utilisateur Admin

**Via Prisma Studio:**

```bash
npx prisma studio
```

Modifier le champ `role` d'un utilisateur à `"admin"`

**Via SQL:**

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

## 📈 Métriques & Monitoring

### KPIs à Surveiller

1. Nombre d'admins actifs
2. Fréquence des changements de rôles
3. Tentatives d'accès non autorisées
4. Taux d'erreur système

### Alertes Recommandées

- Email si > 10 tentatives d'accès refusées/heure
- Slack si taux d'erreur > 5%
- SMS si downtime > 5 minutes

## 🐛 Troubleshooting

### "403 Forbidden" sur les routes admin

**Cause**: L'utilisateur n'a pas le rôle admin
**Solution**: Vérifier le rôle dans la base de données

### Les statistiques ne se chargent pas

**Cause**: Problème de connexion à la base de données
**Solution**: Vérifier `DATABASE_URL` et la connexion

### Audit logs vides

**Cause**: Table `audit_logs` non créée
**Solution**: Exécuter `npx prisma db push`

## 🔮 Améliorations Futures

### Fonctionnalités Prévues

- [ ] Exports CSV des utilisateurs
- [ ] Exports CSV des logs d'audit
- [ ] Dashboard de métriques en temps réel
- [ ] Notifications push pour événements critiques
- [ ] Gestion des permissions granulaires
- [ ] Suspension temporaire d'utilisateurs
- [ ] Recherche avancée multi-critères
- [ ] Graphiques de tendances
- [ ] Rapports automatiques hebdomadaires

### Optimisations

- [ ] Cache Redis pour les stats
- [ ] Pagination cursor-based
- [ ] Websockets pour les updates en temps réel
- [ ] Service workers pour offline support

## 📚 Ressources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Zod Validation](https://zod.dev)

---

**Version**: 1.0.0
**Dernière mise à jour**: 2026-03-02
**Maintenu par**: Équipe Notavex
