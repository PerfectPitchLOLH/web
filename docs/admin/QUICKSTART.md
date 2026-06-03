# 🚀 Quick Start - Dashboard Admin

## Installation en 5 minutes

### 1️⃣ Créer un Utilisateur Admin

```bash
npm run create-admin
```

Suivez les instructions:

- Email: votre-email@example.com
- Nom: Votre Nom
- Mot de passe: (minimum 8 caractères)

✅ **Terminé!** Votre compte admin est créé.

---

### 2️⃣ Configurer Upstash Redis (Rate Limiting)

**Pourquoi?** Protection contre les abus sur les routes admin.

**Étapes**:

1. **Créer un compte gratuit**: [https://console.upstash.com/login](https://console.upstash.com/login)

2. **Créer une base Redis**:
   - Cliquez sur "Create Database"
   - Nom: `notavex-ratelimit`
   - Type: "Regional" (gratuit)
   - Région: La plus proche de vous
   - Cliquez sur "Create"

3. **Copier les credentials**:
   - Dans le dashboard de votre database
   - Copiez `UPSTASH_REDIS_REST_URL`
   - Copiez `UPSTASH_REDIS_REST_TOKEN`

4. **Ajouter dans `.env`**:

```bash
# Ouvrez votre fichier .env
nano .env

# Ajoutez ces lignes:
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="votre-token"
```

✅ **Terminé!** Le rate limiting est configuré.

---

### 3️⃣ Tester le Dashboard

```bash
# Démarrer le serveur
npm run dev

# Ouvrir http://localhost:3000
```

**Connexion**:

1. Allez sur http://localhost:3000/auth/signin
2. Connectez-vous avec votre email et mot de passe admin
3. Cliquez sur votre avatar (en haut à droite)
4. Cliquez sur "Admin Panel" 🛡️

**Vous devriez voir**:

- `/admin` - Dashboard avec statistiques
- `/admin/users` - Gestion des utilisateurs
- `/admin/audit-logs` - Historique des actions
- `/admin/system` - Monitoring système

---

## ✅ Vérifications

### Rate Limiting fonctionne?

```bash
npm run test-rate-limit
```

**Résultat attendu**:

```
✅ Requête 10: Success (200)
✅ Requête 20: Success (200)
...
✅ Requête 100: Success (200)
⛔ Requête 101: Rate Limited (429)
   Message: Too many requests...
   Limit: 100
   Remaining: 0
   Retry-After: 60 secondes

✅ Rate limiting fonctionne correctement!
```

### Tout fonctionne?

```bash
# Build de production
npm run build

# Démarrage
npm start
```

Aucune erreur? ✅ **Vous êtes prêt!**

---

## 🎯 Prochaines Étapes

### Option 1: Développement Local

Vous êtes prêt à développer! Le dashboard admin est complètement fonctionnel en local.

### Option 2: Déploiement Production

**Sur Vercel**:

1. **Push votre code sur GitHub**:

```bash
git add .
git commit -m "feat: add admin dashboard"
git push
```

2. **Connectez Vercel à votre repo**:
   - [vercel.com/new](https://vercel.com/new)
   - Importez votre repo
   - Configurez les variables d'environnement

3. **Variables d'environnement requises**:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="[GÉNÉRER UN NOUVEAU avec: openssl rand -base64 32]"
NEXT_PUBLIC_APP_URL="https://votre-domaine.com"
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."
```

4. **Déployez**: Vercel build automatiquement!

---

## 🔧 Commandes Utiles

```bash
# Créer un admin
npm run create-admin

# Tester rate limiting
npm run test-rate-limit

# Développement
npm run dev

# Production
npm run build
npm start

# Base de données
npx prisma studio          # Interface graphique
npx prisma db push         # Appliquer le schéma
npx prisma generate        # Générer le client

# Qualité du code
npm run lint              # Vérifier
npm run lint:fix          # Corriger
npm run format            # Formater
npm run type-check        # TypeScript
```

---

## ❓ Problèmes Fréquents

### "Admin Panel" n'apparaît pas

**Solution**:

```bash
# Vérifiez le rôle dans la DB
npx prisma studio

# Trouvez votre utilisateur
# Changez `role` à "admin"
```

### "403 Forbidden" sur /admin

**Solution**:

1. Déconnectez-vous
2. Reconnectez-vous
3. Videz le cache du navigateur (Ctrl+Shift+R)

### Rate limiting ne fonctionne pas

**Solution**:

```bash
# Vérifiez .env
cat .env | grep UPSTASH

# Doivent être définis:
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Redémarrez le serveur
npm run dev
```

---

## 📚 Documentation Complète

- [Guide de Configuration Détaillé](./SETUP.md)
- [Documentation Complète](./README.md)
- [Audit de Sécurité](./SECURITY.md)

---

## 🎉 C'est Tout!

Votre dashboard admin est prêt!

**Questions?** Ouvrez une issue sur GitHub.

**Tout fonctionne?** Enjoy! 🚀
