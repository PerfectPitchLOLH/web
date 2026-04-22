# ROADMAP NOTAVEX — Avant lancement client

> Document de référence établi le 2026-04-16 sur la base d'une analyse complète du codebase.
> Notavex est un SaaS de transcription audio → partition musicale (IA), avec abonnements Stripe, crédits minutes, et un panneau admin complet.

---

## LÉGENDE PRIORITÉS

| Symbole | Priorité       | Signification                                                           |
| ------- | -------------- | ----------------------------------------------------------------------- |
| 🔴      | **BLOQUANT**   | Ne pas lancer sans ça — risque légal, UX cassé, ou perte de revenus     |
| 🟠      | **CRITIQUE**   | Doit être fait avant le lancement public — impact direct sur conversion |
| 🟡      | **IMPORTANT**  | À faire dans les 30 jours post-lancement                                |
| 🟢      | **CROISSANCE** | Fonctionnalités de scale — roadmap 60-90 jours                          |

---

## 🔴 PHASE 0 — BLOQUANTS ABSOLUS

### 1. Conformité légale & RGPD

> Sans ces pages, l'app est illégale en France/UE. Les liens dans le Footer pointent vers `#`.

#### 1.1 Pages de contenu juridique

- [ ] **Page CGU** — `/legal/terms`
  - Propriété intellectuelle des partitions générées (l'IA produit, qui détient ?)
  - Responsabilité sur le contenu audio fourni (droit d'auteur sur la musique uploadée)
  - Conditions de résiliation et remboursement
- [ ] **Page CGV** — `/legal/cgv`
  - Politique de remboursement (14 jours légaux UE)
  - Description des abonnements et crédits
  - Droit de rétractation
- [ ] **Politique de confidentialité** — `/legal/privacy`
  - Données collectées : email, audio uploadé (durée de rétention ?), partitions générées
  - Sous-traitants : Stripe, Resend, Neon DB, Upstash, Vercel, FastAPI backend
  - Droits utilisateur : accès, rectification, suppression (l'export existe déjà via `/api/settings/export`)
- [ ] **Politique de cookies** — `/legal/cookies`
  - Cookies d'authentification (session JWT — nécessaires, pas de consentement requis)
  - Cookies analytiques (Vercel Insights — consentement requis)

#### 1.2 Bandeau de consentement cookies (feature à créer)

**Composant à créer : `CookieConsentBanner`**

Fonctionnellement, ce composant doit :

- S'afficher en bas de page (ou modal) à **chaque première visite** (utilisateur non connecté ET connecté non-consentant)
- Proposer **3 boutons** : "Tout accepter", "Tout refuser", "Personnaliser"
- **Bloquer Vercel Insights** tant qu'aucun consentement n'est donné (désactiver le script dans `layout.tsx` de manière conditionnelle)
- **Stocker le choix** en `localStorage` sous clé `cookie_consent` avec date
- **Ne plus s'afficher** si l'utilisateur a déjà fait son choix (vérification au montage)
- Contenir un lien vers `/legal/cookies`

**Composants impactés :**

- `src/app/layout.tsx` — conditionner l'injection du script Vercel Analytics au consentement
- `src/components/providers/` — ajouter un `CookieConsentProvider` ou un hook `useCookieConsent`
- `src/components/landing/Footer.tsx` — mettre à jour les liens légaux (actuellement `href="#"`)
- `src/components/landing/navbar/` — potentiellement afficher un lien "Politique cookies"

#### 1.3 Acceptation des CGU à l'inscription (feature à modifier)

**Actuellement** : le formulaire `/auth/signup` ne demande pas l'acceptation des CGU.

**Feature à ajouter dans `src/components/auth/SignUpForm.tsx` :**

- Ajouter une **checkbox obligatoire** (validation bloquante) : _"J'accepte les [Conditions Générales d'Utilisation] et la [Politique de confidentialité]"_
- La checkbox doit être non-cochée par défaut
- Le bouton "Créer mon compte" est désactivé si la checkbox n'est pas cochée

**Composants/fichiers impactés :**

- `src/components/auth/SignUpForm.tsx` — ajout de la checkbox + validation Zod
- `src/app/api/auth/signup/route.ts` — valider la présence du champ `acceptTerms: true` côté serveur
- `src/server/domains/auth/auth.types.ts` — ajouter `acceptTerms` au DTO de signup
- `prisma/schema.prisma` — ajouter champ `termsAcceptedAt: DateTime?` sur le modèle `User` pour traçabilité

#### 1.4 Mentions légales

- [ ] **Page `/legal/mentions`** avec : éditeur, hébergeur, SIRET, contact email RGPD

---

### 2. Configuration email production

> Resend utilise `onboarding@resend.dev` (sandbox). En production, aucun email ne part hors du sandbox.

#### 2.1 Infrastructure email

- [ ] Configurer un domaine custom Resend (ex: `noreply@notavex.fr`)
- [ ] Configurer SPF + DKIM + DMARC sur le DNS
- [ ] Tester la délivrabilité (mail-tester.com — viser score > 9/10)

#### 2.2 Emails transactionnels manquants (features à créer)

Chaque email ci-dessous implique :

- Un **template HTML** dans `src/server/lib/email/templates/`
- Un **appel dans le service** métier correspondant
- Un **test** de non-régression

| Email                              | Déclencheur                             | Service impacté              |
| ---------------------------------- | --------------------------------------- | ---------------------------- |
| Bienvenue post-inscription         | Création de compte réussie              | `auth.service.ts`            |
| Rappel J-3 avant fin d'essai       | Cron ou webhook Stripe `trial_will_end` | `subscription.service.ts`    |
| Confirmation abonnement souscrit   | Webhook `customer.subscription.created` | `payment.service.ts`         |
| Confirmation achat crédits         | Webhook `checkout.session.completed`    | `credit-purchase.service.ts` |
| Alerte crédits bas (20% restants)  | Lors de la déduction de crédits         | `credit.service.ts`          |
| Alerte crédits épuisés             | Lors de la déduction à 0                | `credit.service.ts`          |
| Échec de paiement                  | Webhook `invoice.payment_failed`        | `payment.service.ts`         |
| Confirmation annulation abonnement | Webhook `customer.subscription.deleted` | `payment.service.ts`         |

---

### 3. Compléter les flux d'authentification

> La page `/auth/forgot-password` est référencée dans le code mais introuvable dans le filesystem.

- [ ] **Vérifier et créer si absent** : `src/app/(auth)/auth/forgot-password/page.tsx`
- [ ] **Vérifier `/auth/reset-password`** : tester les cas token valide, invalide, expiré (affichage d'erreur clair)
- [ ] **Tester le flux complet** : signup → verify → signin → forgot → reset → signin

---

### 4. Gestion des erreurs serveur

- [ ] **Créer `src/app/error.tsx`** — boundary d'erreur globale (page 500 brandée)
- [ ] **Créer `src/app/global-error.tsx`** — erreur au niveau root layout (écran blanc actuellement)
- [ ] **Intégrer Sentry** pour le tracking d'erreurs en production
- [ ] **Tester les pannes** : DB indisponible, FastAPI backend down, Stripe timeout

---

### 5. Variables d'environnement production

- [ ] Auditer toutes les `NEXT_PUBLIC_*` — rien de secret côté client
- [ ] Configurer les Price IDs Stripe **LIVE** (actuellement TEST)
- [ ] Configurer `NEXT_PUBLIC_API_URL` et `NEXT_PUBLIC_WS_URL` vers la production
- [ ] Valider `.env.production` avec toutes les clés LIVE

---

## 🟠 PHASE 1 — CRITIQUE PRÉ-LANCEMENT

### 6. Onboarding utilisateur

> Les nouveaux utilisateurs arrivent sur le dashboard sans aucun guidage.

#### 6.1 Crédits de bienvenue (feature à modifier)

**Actuellement** : aucun crédit n'est donné à l'inscription en plan Free.

**Feature à ajouter dans `src/server/domains/auth/auth.service.ts`** :

- Lors de la création de compte, appeler `creditService.addWelcomeCredits(userId, WELCOME_MINUTES)` (ex: 2 minutes)
- Créer une transaction de type `welcome_bonus` dans `CreditTransaction`
- Afficher un message de bienvenue dans le dashboard ("2 minutes offertes pour votre première transcription !")

**Fichiers impactés :**

- `src/server/domains/credit/credit.service.ts` — ajouter méthode `addWelcomeCredits`
- `src/server/domains/credit/credit.types.ts` — ajouter type de transaction `welcome_bonus`
- `prisma/schema.prisma` — si l'enum `CreditTransactionType` est strict, ajouter la valeur
- `src/server/domains/auth/auth.service.ts` — appeler le service crédits post-création compte

#### 6.2 Empty states (feature à ajouter sur plusieurs pages)

**Actuellement** : les pages avec listes vides (partitions, historique crédits) affichent probablement du vide ou des spinners infinis.

**À créer pour chaque page :**

- `src/app/(dashboard)/dashboard/partitions/page.tsx` — illustration + "Vous n'avez pas encore de partitions. Transcrivez votre premier audio."
- `src/app/(dashboard)/dashboard/credits/history/page.tsx` — "Aucune transaction pour le moment."
- `src/components/partitions/PartitionLibrary.tsx` — état vide avec CTA

#### 6.3 Tour guidé au premier accès (optionnel mais recommandé)

- Afficher une série de tooltips séquentiels au premier login
- Marquer `onboardingCompleted: true` dans les settings utilisateur une fois le tour terminé
- **Fichiers impactés** : `src/server/domains/settings/` (ajouter champ), `src/components/dashboard/`

---

### 7. Expérience de la feature principale (Audio-to-Sheet)

- [ ] **Tester le flux complet** sur les 3 sources : fichier audio, YouTube, Spotify
- [ ] **Cas d'erreur** : fichier corrompu, URL invalide, backend indisponible — message humain (pas de stack trace)
- [ ] **Vérifier `ResumeBanner`** — reprendre une transcription en cours après navigation
- [ ] **Valider les exports** selon les droits du plan (PDF/MusicXML bloqués en dessous de Junior/Basic)
- [ ] **Tester le cas "plus de crédits"** — le message d'upgrade doit être clair, avec un lien direct vers `/dashboard/subscription`
- [ ] **Tester sur mobile** — upload, progress, résultat SVG

---

### 8. Features "Pro" — état réel à valider

> Ces fonctionnalités sont vendues mais leur implémentation complète est incertaine.

- [ ] **Sheet editor (Pro)** — si non implémenté : retirer de la page prix et du plan Pro jusqu'à disponibilité
- [ ] **Falling notes** — tester end-to-end, corriger si cassé
- [ ] **Collaboration (Pro)** — si partiel : ne pas le vendre comme différenciateur
- [ ] **API access (Pro)** — documenter ou retirer de l'offre si non prêt

**Si une feature Pro est retirée**, les fichiers impactés sont :

- `src/components/dashboard/subscription/NewSubscriber/PricingView.tsx` — retirer la ligne du comparatif
- `src/server/domains/permission/permission.constants.ts` — retirer la permission
- `src/server/domains/subscription/subscription.constants.ts` — mettre à jour les features du plan

---

### 9. Logique de dunning (récupération des paiements échoués)

> ~15-20% des paiements récurrents échouent. Sans dunning, c'est du chiffre d'affaires perdu.

#### 9.1 Webhooks Stripe à compléter

**Dans `src/app/api/webhooks/stripe/route.ts`**, le webhook `invoice.payment_failed` est probablement reçu mais pas pleinement traité.

**Feature à ajouter :**

- À réception de `invoice.payment_failed` :
  - Envoyer l'email "échec de paiement" (voir section 2.2)
  - Créer une notification in-app pour l'utilisateur (`notification.service.ts`)
  - Logger dans `AuditLog`
- À réception de `invoice.payment_failed` pour la 3e fois :
  - Passer le statut abonnement à `past_due`
  - Réduire les droits utilisateur (bloquer les nouvelles transcriptions)

#### 9.2 Banner in-app pour les comptes en échec de paiement

**Feature à ajouter dans `src/components/dashboard/`** :

- Composant `PaymentFailedBanner` — bandeau rouge en haut du dashboard
- Visible uniquement si `subscription.status === 'past_due'`
- Message : "Votre paiement a échoué. Mettez à jour votre moyen de paiement pour continuer à utiliser Notavex."
- Bouton "Mettre à jour" → lien vers `/api/subscriptions/portal`

**Fichiers impactés :**

- `src/app/(dashboard)/dashboard/layout.tsx` — afficher le banner conditionnel
- `src/hooks/useSubscription.ts` — exposer le statut `past_due`
- `src/server/domains/payment/payment.service.ts` — gérer la logique de grace period

---

### 10. Sécurité — audit avant lancement

- [ ] **`npm audit`** — corriger les vulnérabilités high/critical
- [ ] **Rotation des secrets** — vérifier qu'aucune clé n'est dans git :
  ```bash
  git log --all --full-history -- "*.env*"
  ```
- [ ] **CAPTCHA sur les formulaires d'auth** (hCaptcha ou Cloudflare Turnstile)
  - Cible : signup et forgot-password
  - **Fichiers impactés** : `src/components/auth/SignUpForm.tsx`, `src/app/api/auth/signup/route.ts`
- [ ] **Vérifier la signature webhook Stripe** — `stripe.webhooks.constructEvent` doit être en place
- [ ] **Tester l'impersonation admin** — logs corrects, fin de session propre
- [ ] **Feedback visuel force du mot de passe** dans `SignUpForm.tsx` (jauge ou indicateur)

---

### 11. Performance & fiabilité

- [ ] Tester avec Lighthouse — score Performance > 90 sur la landing page
- [ ] Lazy loading des composants lourds (sheet music viewer)
- [ ] Tester les timeouts FastAPI (> 30s) — que voit l'utilisateur ?
- [ ] Health check uptime monitoring sur `/api/transcription/health` (Better Uptime, UptimeRobot)
- [ ] Vérifier la config Prisma + Neon pour le serverless (connection pooling)

---

### 12. Analytics & monitoring

> Impossible de piloter un lancement sans data.

- [ ] **Intégrer PostHog** (ou Plausible pour RGPD-friendly — pas de bandeau cookie requis avec Plausible)
  - Events clés à tracker : `signup_completed`, `transcription_started`, `transcription_completed`, `subscription_created`, `credit_purchased`, `export_downloaded`
  - **Fichiers impactés** : `src/components/providers/`, `src/hooks/useTranscription.ts`, pages concernées
- [ ] **Dashboard MRR dans le panneau admin**
  - Requêtes sur `Invoice` et `Subscription` pour afficher : MRR, nouveaux abonnés du mois, churned
  - **Fichiers impactés** : `src/app/admin/page.tsx`, `src/server/domains/admin/admin.service.ts`
- [ ] **Sentry** pour les erreurs critiques (voir phase 0)
- [ ] **Uptime monitoring** sur les endpoints critiques

---

## 🟡 PHASE 2 — 30 JOURS POST-LANCEMENT

### 13. Support client

- [ ] **Widget de chat** — Crisp (RGPD-friendly, gratuit jusqu'à 2 agents)
  - Injecter le script Crisp dans `src/app/layout.tsx` (conditionné au consentement cookie)
- [ ] **Page FAQ / Centre d'aide** — `/help`
  - "Comment fonctionne la transcription ?"
  - "Que sont les crédits ?"
  - "Quels formats audio sont supportés ?"
  - "Comment annuler mon abonnement ?"
  - "Remboursement : comment ça marche ?"
- [ ] **Page de statut système** — `/status` ou intégration Statuspage.io
  - Afficher l'état du backend de transcription (branché sur `/api/transcription/health`)
- [ ] **Système de feedback post-transcription**
  - Note 1-5 + commentaire optionnel après chaque transcription terminée
  - **Feature à ajouter dans** `src/components/audio-to-sheet/TranscriptionResultView.tsx`
  - Stocker dans une nouvelle table `TranscriptionFeedback` (nouveau model Prisma)

---

### 14. Système de coupon / promotions

- [ ] **Champ "code promo"** sur la page de paiement Stripe
  - Activer `allow_promotion_codes: true` dans `session.create()` côté `subscription.service.ts`
  - **Fichiers impactés** : `src/server/domains/subscription/subscription.service.ts`
- [ ] Créer des coupons dans Stripe Dashboard pour le lancement (ex: `LANCEMENT2026` → 30% off premier mois)
- [ ] Tracking des codes utilisés dans le panneau admin

---

### 15. Internationalisation (i18n)

> Le language selector est présent visuellement mais purement décoratif (aucune traduction).

**Feature à implémenter** : `next-intl` avec routing par locale

**Fichiers impactés :**

- `src/app/layout.tsx` — wrapper avec provider i18n
- `src/app/(landing)/` — toutes les pages publiques à traduire en priorité
- `src/components/landing/` — tous les composants landing
- `src/components/landing/Footer.tsx` — connecter le sélecteur de langue au routing
- `src/components/landing/navbar/` — idem
- Emails transactionnels — templates en FR et EN
- `next.config.ts` — configurer les locales

**Priorité de traduction** : FR (défaut) → EN → ES → DE

---

### 16. SEO — finalisation

- [ ] Dynamiser le JSON-LD (remplacer les avis hardcodés 4.8 / 1247 reviews)
  - **Fichier impacté** : `src/app/(landing)/page.tsx` ou composant qui l'injecte
- [ ] Ajouter FAQ schema sur la section FAQ
- [ ] Optimiser les Core Web Vitals : LCP < 2.5s, CLS < 0.1, INP < 200ms
- [ ] Vérifier Google Search Console après lancement

---

### 17. Accessibilité (a11y)

- [ ] **Activer `eslint-plugin-jsx-a11y`** dans `eslint.config.mjs` (installé mais absent de la config)
- [ ] Ajouter `prefers-reduced-motion` aux animations Framer Motion dans les composants landing
- [ ] Tester la navigation clavier sur formulaires et modales
- [ ] Ajouter des `aria-label` sur les boutons icônes
- [ ] Vérifier le contraste des textes secondaires

---

### 18. Amélioration de la page abonnement

- [ ] **Downgrade d'abonnement** — actuellement seul l'upgrade fonctionne
  - Ajouter endpoint `POST /api/subscriptions/downgrade` avec proration Stripe
  - **Fichiers impactés** : `src/server/domains/subscription/subscription.service.ts`, `src/server/domains/subscription/subscription.controller.ts`, `src/app/api/subscriptions/downgrade/route.ts`
  - Ajouter le bouton "Changer de plan" dans `src/components/dashboard/subscription/GestionAbonnement/`
- [ ] Afficher la **date de prochain renouvellement** sur la page subscription
- [ ] Afficher l'**historique de facturation** (invoices depuis la table `Invoice`)
- [ ] Calcul d'économies en mode annuel mis en évidence ("Économisez 2 mois !")
  - **Fichier impacté** : `src/components/dashboard/subscription/NewSubscriber/PricingView.tsx`

---

## 🟢 PHASE 3 — CROISSANCE (60-90 JOURS)

### 19. Programme de parrainage

> Canal d'acquisition le moins cher — modèle Dropbox/Revolut.

- [ ] Système de referral avec codes uniques par utilisateur
- [ ] Récompense double-face : 5 min offertes au parrain ET au filleul à l'inscription du filleul
- [ ] Page `/referral` avec lien partageable
- [ ] **Nouveau domaine Prisma** : `referral/` avec `ReferralCode`, `ReferralConversion`
- [ ] Tracking des conversions dans le panneau admin

---

### 20. API publique (feature Pro)

> L'API access est un avantage vendu dans le plan Pro — rien n'est documenté ou implémenté.

- [ ] Définir les endpoints API publics (ex: `POST /api/v1/transcribe`, `GET /api/v1/jobs/:id`)
- [ ] Générer et gérer les **API keys** depuis les paramètres utilisateur
  - **Nouveau modèle Prisma** : `ApiKey` lié à `User`
  - **Fichiers impactés** : `prisma/schema.prisma`, `src/app/(dashboard)/dashboard/settings/`, `src/server/domains/`
- [ ] Rate limiting par API key selon le plan
- [ ] Documentation OpenAPI à `/api-docs` (swagger-ui ou Scalar)

---

### 21. Intégrations tierces

- [ ] **MuseScore** — bouton "Ouvrir dans MuseScore" sur la page de résultat
- [ ] **Zapier/Make** — webhook sortant pour les utilisateurs Pro quand une transcription est prête
- [ ] **Plugin Notion** ou export vers Google Drive

---

### 22. Analytics produit avancé

- [ ] Funnel de conversion : landing → signup → premier usage → upgrade
- [ ] Cohort analysis : retention J+7, J+30, J+90
- [ ] Heatmaps sur la landing page (PostHog heatmaps)
- [ ] A/B test sur le pricing (ordre des plans, mise en avant du plan recommandé)
- [ ] Churn prediction — alerte support si un Pro n'utilise plus l'app depuis 14 jours

---

### 23. Collaboration (feature Pro)

- [ ] Partager une partition avec un lien public en lecture seule
  - **Nouveau champ Prisma** : `shareToken: String?` sur `SavedPartition`
  - **Nouveau endpoint** : `POST /api/partitions/:id/share`
- [ ] Inviter des collaborateurs par email (max 5 pour le plan Pro)
- [ ] Commentaires sur une partition partagée

---

## CHECKLIST PRÉ-LANCEMENT FINAL

```
LÉGAL & CONFORMITÉ
[ ] Pages CGU, CGV, Privacy, Cookies, Mentions légales en ligne
[ ] Liens Footer mis à jour (plus de href="#")
[ ] Bandeau consentement cookies fonctionnel (accepter / refuser)
[ ] Checkbox CGU dans le formulaire d'inscription
[ ] Politique de remboursement 14 jours conforme

TECHNIQUE
[ ] Stripe en mode LIVE (pas TEST)
[ ] Email domain custom configuré + SPF/DKIM/DMARC validés
[ ] Sentry configuré et recevant des événements de test
[ ] Uptime monitoring sur /api/transcription/health
[ ] npm audit — 0 vulnérabilité critical/high
[ ] Flux auth complet testé (signup → verify → login → forgot → reset)
[ ] Page error.tsx et global-error.tsx créées

PRODUIT
[ ] Flux transcription testé (audio file + YouTube + Spotify)
[ ] Exports PDF/MIDI/MusicXML testés selon les droits du plan
[ ] Gestion des crédits épuisés testée (message + CTA upgrade)
[ ] Paiement Stripe testé en mode LIVE avec vraie CB
[ ] Webhooks Stripe testés (subscription, payment, échec)
[ ] Banner in-app pour les comptes en past_due

EXPÉRIENCE UTILISATEUR
[ ] Empty states sur toutes les pages avec listes vides
[ ] Messages d'erreur clairs sur tous les cas d'échec
[ ] Mobile responsive vérifié (iPhone + Android)
[ ] Temps de chargement < 3s mesuré sur Lighthouse

BUSINESS
[ ] Analytics actifs et events clés trackés
[ ] Email de bienvenue envoyé à l'inscription
[ ] Coupon code lancement créé dans Stripe Dashboard
[ ] Support accessible (chat ou email visible sur toutes les pages)
[ ] Dashboard MRR dans le panneau admin opérationnel
```

---

## ESTIMATION DE CHARGE (approximative)

| Phase      | Contenu                                                | Effort estimé |
| ---------- | ------------------------------------------------------ | ------------- |
| 🔴 Phase 0 | Légal + email + auth + erreurs                         | 3-5 jours     |
| 🟠 Phase 1 | Onboarding + features + dunning + sécurité + analytics | 5-8 jours     |
| 🟡 Phase 2 | Support + coupon + i18n + SEO + a11y + abonnement      | 7-10 jours    |
| 🟢 Phase 3 | Referral + API + intégrations + analytics avancé       | 10-15 jours   |

**Total avant lancement viable : ~8-13 jours de développement (Phases 0 + 1)**
