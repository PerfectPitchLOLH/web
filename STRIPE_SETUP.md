# Guide de Configuration Stripe pour Notavex

Ce guide vous explique comment configurer Stripe pour le système de crédits et d'abonnements de Notavex.

## Table des matières

1. [Prérequis](#prérequis)
2. [Configuration Stripe Dashboard](#configuration-stripe-dashboard)
3. [Configuration des Variables d'Environnement](#configuration-des-variables-denvironnement)
4. [Migration de la Base de Données](#migration-de-la-base-de-données)
5. [Configuration des Webhooks](#configuration-des-webhooks)
6. [Octroi des Crédits de Bienvenue](#octroi-des-crédits-de-bienvenue)
7. [Tests](#tests)

## Prérequis

- Un compte Stripe (créez-en un sur [stripe.com](https://stripe.com))
- Une base de données PostgreSQL configurée
- Les variables d'environnement de base déjà configurées (.env)

## Configuration Stripe Dashboard

### 1. Créer les Produits et Prix

Connectez-vous à votre [Stripe Dashboard](https://dashboard.stripe.com) et créez les produits suivants:

#### a) Plan Junior

1. Allez dans **Products** → **Add Product**
2. Nom: `Notavex Junior`
3. Description: `Parfait pour débuter avec la transcription musicale`
4. Créez deux prix récurrents:
   - **Mensuel**: 9.99 EUR/mois
   - **Annuel**: 99.99 EUR/an

#### b) Plan Advanced

1. Créez un nouveau produit
2. Nom: `Notavex Advanced`
3. Description: `Idéal pour les musiciens réguliers`
4. Créez deux prix récurrents:
   - **Mensuel**: 14.99 EUR/mois
   - **Annuel**: 149.99 EUR/an

#### c) Plan Pro

1. Créez un nouveau produit
2. Nom: `Notavex Pro`
3. Description: `La puissance complète pour les professionnels`
4. Créez deux prix récurrents:
   - **Mensuel**: 29.99 EUR/mois
   - **Annuel**: 299.99 EUR/an

### 2. Récupérer les IDs de Prix

Pour chaque prix créé, copiez l'ID (commence par `price_`). Vous en aurez besoin pour les variables d'environnement.

### 3. Créer les Plans dans la Base de Données

Après avoir exécuté la migration (voir section suivante), vous devrez créer les plans dans votre base de données. Créez un script ou utilisez un client SQL:

```sql
-- Plan Junior
INSERT INTO subscription_plans (
  id, stripe_product_id, stripe_price_id, name, description,
  monthly_price, yearly_price, transcription_minutes,
  features, is_active, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'prod_XXXXX', -- Remplacez par votre Product ID Junior
  'price_XXXXX', -- Remplacez par votre Price ID Junior Monthly
  'Junior',
  'Parfait pour débuter avec la transcription musicale',
  9.99,
  99.99,
  10,
  '{"transcriptionMinutes":10,"fallingNotes":true,"historyDays":30,"sheetEditor":false,"polyphony":false}'::jsonb,
  true,
  NOW(),
  NOW()
);

-- Répétez pour Advanced et Pro
```

## Configuration des Variables d'Environnement

Copiez `.env.example` vers `.env` et configurez les variables Stripe:

```bash
# Clés API Stripe (trouvez-les dans Developers > API keys)
STRIPE_SECRET_KEY="sk_test_XXXXXXXXXXXXX"
STRIPE_PUBLISHABLE_KEY="pk_test_XXXXXXXXXXXXX"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_XXXXXXXXXXXXX"

# Webhook Secret (sera généré à l'étape suivante)
STRIPE_WEBHOOK_SECRET="whsec_XXXXXXXXXXXXX"

# Price IDs Backend
STRIPE_JUNIOR_MONTHLY_PRICE_ID="price_XXXXX"
STRIPE_JUNIOR_YEARLY_PRICE_ID="price_XXXXX"
STRIPE_ADVANCED_MONTHLY_PRICE_ID="price_XXXXX"
STRIPE_ADVANCED_YEARLY_PRICE_ID="price_XXXXX"
STRIPE_PRO_MONTHLY_PRICE_ID="price_XXXXX"
STRIPE_PRO_YEARLY_PRICE_ID="price_XXXXX"

# Price IDs Frontend (mêmes valeurs)
NEXT_PUBLIC_STRIPE_JUNIOR_MONTHLY_PRICE_ID="price_XXXXX"
NEXT_PUBLIC_STRIPE_JUNIOR_YEARLY_PRICE_ID="price_XXXXX"
NEXT_PUBLIC_STRIPE_ADVANCED_MONTHLY_PRICE_ID="price_XXXXX"
NEXT_PUBLIC_STRIPE_ADVANCED_YEARLY_PRICE_ID="price_XXXXX"
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID="price_XXXXX"
NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID="price_XXXXX"
```

## Migration de la Base de Données

Exécutez la migration Prisma pour créer les nouvelles tables:

```bash
npx prisma migrate dev --name add_subscription_system
```

Cela créera les tables suivantes:

- `customers` - Clients Stripe liés aux utilisateurs
- `subscription_plans` - Plans d'abonnement disponibles
- `subscriptions` - Abonnements actifs des utilisateurs
- `invoices` - Historique des factures

Ensuite, générez le client Prisma:

```bash
npx prisma generate
```

## Configuration des Webhooks

Les webhooks permettent à Stripe de notifier votre application des événements (paiements, annulations, etc.).

### En Développement (avec Stripe CLI)

1. Installez Stripe CLI: https://stripe.com/docs/stripe-cli#install

2. Connectez-vous:

```bash
stripe login
```

3. Lancez le webhook forwarding:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

4. Copiez le webhook secret affiché (commence par `whsec_`) et ajoutez-le à `.env`:

```bash
STRIPE_WEBHOOK_SECRET="whsec_XXXXXXXXXXXXX"
```

### En Production

1. Allez dans **Developers** → **Webhooks** → **Add endpoint**

2. URL du endpoint:

```
https://votre-domaine.com/api/webhooks/stripe
```

3. Sélectionnez les événements suivants:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `payment_intent.succeeded`

4. Copiez le signing secret et ajoutez-le à vos variables d'environnement de production.

## Octroi des Crédits de Bienvenue

Le système octroie automatiquement 3 minutes gratuites à chaque nouvel utilisateur. Cela se fait via le hook `subscriptionService.grantWelcomeCredits()`.

Pour l'intégrer dans votre flux d'inscription:

```typescript
// Dans votre route d'inscription ou après création de compte
import { subscriptionService } from '@/server/domains/subscription'

// Après avoir créé l'utilisateur
await subscriptionService.grantWelcomeCredits(userId, userEmail)
```

## Tests

### Tester un Abonnement

1. Démarrez votre serveur de développement:

```bash
npm run dev
```

2. Lancez le webhook forwarding (dans un autre terminal):

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

3. Allez sur `/dashboard/subscription`

4. Cliquez sur "Commencer" pour un plan

5. Utilisez une carte de test Stripe:
   - Numéro: `4242 4242 4242 4242`
   - Date: n'importe quelle date future
   - CVC: n'importe quel 3 chiffres

6. Vérifiez que:
   - La redirection vers Stripe Checkout fonctionne
   - Le paiement est traité
   - Vous êtes redirigé vers le dashboard
   - L'abonnement apparaît dans votre compte
   - Les crédits mensuels sont octroyés

### Tester un Achat de Crédits

1. Allez sur `/dashboard/subscription`

2. Scrollez jusqu'à la section "Besoin de minutes supplémentaires ?"

3. Cliquez sur "Acheter" pour un bundle

4. Complétez le paiement avec une carte de test

5. Vérifiez que les crédits sont ajoutés à votre solde

### Cartes de Test Stripe

Stripe fournit de nombreuses cartes de test pour différents scénarios:

- **Succès**: `4242 4242 4242 4242`
- **Échec**: `4000 0000 0000 0002`
- **3D Secure requis**: `4000 0027 6000 3184`
- **Refusée (fonds insuffisants)**: `4000 0000 0000 9995`

Plus d'informations: https://stripe.com/docs/testing

## Gestion des Abonnements

Les utilisateurs peuvent gérer leur abonnement via le Stripe Customer Portal:

1. Implémentez un bouton "Gérer mon abonnement"
2. Appelez l'API `/api/subscriptions/portal`
3. Redirigez l'utilisateur vers l'URL retournée

Le portail permet de:

- Mettre à jour la méthode de paiement
- Changer de plan
- Annuler l'abonnement
- Voir les factures

## Sécurité

⚠️ **Important:**

1. **Ne jamais exposer les clés secrètes** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) côté client

2. **Valider tous les webhooks** - Le code vérifie déjà la signature Stripe

3. **En production**, utilisez les clés Live au lieu des clés Test

4. **Activer Stripe Radar** pour la détection de fraudes (recommandé)

## Support

- Documentation Stripe: https://stripe.com/docs
- Stripe Dashboard: https://dashboard.stripe.com
- Stripe Support: https://support.stripe.com

## Troubleshooting

### Webhook non reçu

1. Vérifiez que le webhook forwarding est actif (stripe listen)
2. Vérifiez les logs dans Stripe Dashboard > Developers > Webhooks
3. Vérifiez que `STRIPE_WEBHOOK_SECRET` est correct

### Paiement échoue

1. Vérifiez les logs dans Stripe Dashboard > Payments
2. Vérifiez que les Price IDs sont corrects
3. Vérifiez que le client Stripe est créé correctement

### Crédits non octroyés

1. Vérifiez les logs du webhook
2. Vérifiez que l'événement `invoice.payment_succeeded` est traité
3. Vérifiez la table `credit_transactions` pour voir les transactions
