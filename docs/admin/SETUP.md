# Guide de Configuration du Dashboard Admin

## 📋 Prérequis

- Node.js 20+
- PostgreSQL (ou Neon)
- Compte Upstash Redis (gratuit)

## 🚀 Installation Rapide

### Étape 1: Configuration des Variables d'Environnement

Copiez le fichier `.env.example` vers `.env`:

```bash
cp .env.example .env
```

Puis modifiez les valeurs dans `.env`:

#### Variables Obligatoires

```env
# Base de données PostgreSQL
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=verify-full"

# Secret pour NextAuth (générer avec la commande ci-dessous)
AUTH_SECRET="votre-secret-genere"

# URL de votre application
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # En dev
# NEXT_PUBLIC_APP_URL="https://votre-domaine.com"  # En production

# Redis Upstash pour rate limiting (OBLIGATOIRE)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="votre-token-upstash"
```

#### Générer AUTH_SECRET

```bash
openssl rand -base64 32
```

Copiez le résultat dans `AUTH_SECRET`.

#### Variables Optionnelles

```env
# Google OAuth (si vous utilisez Google Sign-In)
AUTH_GOOGLE_ID="votre-google-client-id"
AUTH_GOOGLE_SECRET="votre-google-client-secret"

# Resend pour les emails (notifications, etc.)
RESEND_API_KEY="re_votre_cle_resend"
```

### Étape 2: Configurer Upstash Redis

**Pourquoi?** Le rate limiting nécessite Redis pour fonctionner.

1. **Créer un compte gratuit**: [https://console.upstash.com/login](https://console.upstash.com/login)

2. **Créer une base Redis**:
   - Cliquez sur "Create Database"
   - Choisissez un nom (ex: `notavex-ratelimit`)
   - Sélectionnez la région la plus proche
   - Type: "Regional" (gratuit)
   - Cliquez sur "Create"

3. **Récupérer les credentials**:
   - Dans le dashboard de votre database
   - Copiez `UPSTASH_REDIS_REST_URL`
   - Copiez `UPSTASH_REDIS_REST_TOKEN`
   - Collez-les dans votre `.env`

**Plan gratuit Upstash**:

- 10,000 commandes/jour
- 256 MB de stockage
- Largement suffisant pour le rate limiting

### Étape 3: Initialiser la Base de Données

```bash
# Générer le client Prisma
npx prisma generate

# Appliquer le schéma à la DB
npx prisma db push

# (Optionnel) Voir la DB dans l'interface graphique
npx prisma studio
```

### Étape 4: Créer un Utilisateur Admin

**Option A: Script Interactif** (Recommandé)

```bash
npm run create-admin
```

Le script vous demandera:

- Email de l'admin
- Nom complet
- Mot de passe (min 8 caractères)

**Option B: Prisma Studio**

```bash
npx prisma studio
```

1. Ouvrez `http://localhost:5555`
2. Allez dans la table `User`
3. Cliquez sur "Add record"
4. Remplissez:
   - `email`: votre email
   - `name`: votre nom
   - `password`: (laisser null si vous utilisez Google OAuth)
   - `role`: `admin` ⚠️ **IMPORTANT**
   - `emailVerified`: Date actuelle
5. Cliquez sur "Save"

**Option C: SQL Direct**

```sql
-- Remplacez les valeurs
UPDATE users
SET role = 'admin'
WHERE email = 'votre-email@example.com';
```

### Étape 5: Démarrer l'Application

```bash
# Mode développement
npm run dev

# Ou avec Docker
docker compose up
```

Ouvrez [http://localhost:3000](http://localhost:3000)

### Étape 6: Tester l'Accès Admin

1. Connectez-vous avec votre compte admin
2. Cliquez sur votre avatar (en haut à droite)
3. Vous devriez voir "Admin Panel" avec un bouclier rouge
4. Cliquez dessus pour accéder au dashboard

## 🔐 Configuration de Sécurité en Production

### Variables d'Environnement Vercel/Production

```env
# Base de données (utilisez la connection string de production)
DATABASE_URL="postgresql://..."

# Auth Secret (GÉNÉREZ UN NOUVEAU pour la production!)
AUTH_SECRET="nouveau-secret-production-different-de-dev"

# URL de production
NEXT_PUBLIC_APP_URL="https://votre-domaine.com"

# Redis Upstash (peut être le même qu'en dev ou un nouveau)
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."

# Autres services
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
RESEND_API_KEY="..."
```

### Déploiement sur Vercel

1. **Connectez votre repo GitHub**

2. **Configurez les variables d'environnement**:
   - Allez dans Settings > Environment Variables
   - Ajoutez toutes les variables ci-dessus
   - ⚠️ **Ne commitez JAMAIS votre `.env` dans Git**

3. **Build Settings**:
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **Déployez**

### Headers de Sécurité (Recommandé)

Ajoutez dans `next.config.ts`:

```typescript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
]

export default {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}
```

## ⚙️ Configuration du Rate Limiting

Le rate limiting est déjà configuré! Voici les limites par défaut:

### Limites Configurées

| Endpoint       | Limite  | Fenêtre  |
| -------------- | ------- | -------- |
| `/api/admin/*` | 100 req | 1 minute |
| `/api/auth/*`  | 10 req  | 1 minute |

### Personnaliser les Limites

Modifiez dans `src/server/shared/middleware/rate-limit.middleware.ts`:

```typescript
// Pour les routes admin
const adminRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '60 s'), // Changez ici
})

// Pour l'authentification
const authRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '60 s'), // Changez ici
})
```

### Tester le Rate Limiting

```bash
# Testez avec curl
for i in {1..15}; do
  curl -X GET http://localhost:3000/api/admin/stats
done

# Après 10-15 requêtes, vous devriez recevoir:
# { "error": "Too many requests" }
```

## 🐛 Troubleshooting

### Erreur: "UPSTASH_REDIS_REST_URL is not defined"

**Solution**: Vérifiez que vous avez bien ajouté les variables Upstash dans `.env`:

```env
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
```

Puis redémarrez le serveur:

```bash
npm run dev
```

### Erreur: "Admin Panel" n'apparaît pas dans le menu

**Cause**: Votre utilisateur n'a pas le rôle `admin`

**Solution**:

```bash
# Vérifiez le rôle
npx prisma studio

# Ou avec SQL
# SELECT role FROM users WHERE email = 'votre-email@example.com';
```

### Erreur: "403 Forbidden" sur les routes admin

**Cause**: La session n'est pas reconnue comme admin

**Solutions**:

1. Déconnectez-vous et reconnectez-vous
2. Vérifiez que `AUTH_SECRET` est bien défini
3. Videz les cookies du navigateur
4. Vérifiez que le rôle est bien `admin` dans la DB

### Rate Limiting ne fonctionne pas

**Vérifiez**:

1. Upstash Redis est bien configuré
2. Les variables d'environnement sont correctes
3. Redémarrez le serveur après modification du `.env`

**Test manuel**:

```bash
# Testez la connexion Redis
curl https://your-redis.upstash.io/get/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Monitoring en Production

### Logs à Surveiller

1. **Tentatives d'accès non autorisées**:

```bash
# Recherchez dans vos logs
grep "ADMIN_UNAUTHORIZED_ACCESS" logs/
```

2. **Rate limiting dépassé**:

```bash
grep "Too many requests" logs/
```

3. **Modifications de rôles**:

```bash
grep "user_role_updated" logs/
```

### Alertes Recommandées

Configurez des alertes (Sentry, Datadog, etc.) pour:

- Plus de 10 tentatives d'accès refusées/heure
- Taux d'erreur > 5%
- Temps de réponse > 1000ms
- Database connection failures

## ✅ Checklist de Déploiement

Avant de déployer en production:

- [ ] `.env` configuré avec toutes les variables
- [ ] `AUTH_SECRET` généré et différent de dev
- [ ] Upstash Redis configuré et testé
- [ ] Au moins un utilisateur admin créé
- [ ] Rate limiting testé localement
- [ ] Build réussit sans erreurs (`npm run build`)
- [ ] Tests passent (`npm run test`)
- [ ] Variables d'environnement ajoutées sur Vercel/serveur
- [ ] HTTPS activé en production
- [ ] Monitoring configuré (logs, alertes)
- [ ] Backup de la base de données configuré

## 🆘 Support

Si vous rencontrez des problèmes:

1. Vérifiez la [documentation complète](./README.md)
2. Consultez l'[audit de sécurité](./SECURITY.md)
3. Vérifiez les logs serveur: `docker logs web-dev` ou console Vercel
4. Ouvrez une issue sur GitHub

---

**Prêt?** Lancez `npm run create-admin` et commencez! 🚀
