# Notavex Web Application

Application web Next.js avec architecture server-side Domain-Driven Design, Prisma ORM, et validation Zod.

## Stack Technique

- **Framework**: Next.js 16 avec App Router
- **Runtime**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Database ORM**: Prisma 7 avec PostgreSQL (Neon)
- **Validation**: Zod 4
- **Linting**: ESLint 9 + Prettier
- **Git Hooks**: Husky + lint-staged
- **Containerization**: Docker

## Installation

```bash
# Cloner le projet
git clone <repository-url>
cd web_app

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos credentials
```

## Commandes de Développement

### Serveur de développement

```bash
# Démarrer le serveur local
npm run dev
```

Ouvrir http://localhost:3000

### Base de données (Prisma)

```bash
# Générer le client Prisma
npx prisma generate

# Pousser le schema vers la DB (dev)
npx prisma db push

# Créer une migration
npx prisma migrate dev --name nom_migration

# Ouvrir Prisma Studio (GUI)
npx prisma studio

# Reset la base de données
npx prisma migrate reset
```

### Linting & Formatting

```bash
# Vérifier les erreurs ESLint
npm run lint

# Corriger automatiquement les erreurs
npm run lint:fix

# Formatter tout le code
npm run format

# Vérifier le formatage
npm run format:check
```

### Build & Production

```bash
# Build production
npm run build

# Démarrer en production
npm start
```

## Docker

### Développement avec Docker

```bash
# Démarrer le container de développement
docker compose up

# En mode détaché
docker compose up -d

# Voir les logs
docker compose logs -f web-dev

# Arrêter le container
docker compose down
```

Le serveur sera disponible sur http://localhost:3000 avec hot reload.

### Production avec Docker

```bash
# Build et démarrer le container de production
docker compose --profile production up web-prod

# En mode détaché
docker compose --profile production up -d web-prod

# Arrêter
docker compose --profile production down
```

Le serveur sera disponible sur http://localhost:3001

## Structure du Projet

```
src/
├── app/
│   ├── api/              # API Routes
│   │   └── users/        # Exemple domaine User
│   ├── globals.css       # Styles globaux Tailwind
│   └── layout.tsx        # Layout racine
│
├── server/               # Code server-side
│   ├── domains/          # Domaines métier (DDD)
│   │   └── user/
│   │       ├── user.types.ts       # Types TypeScript
│   │       ├── user.schemas.ts     # Validation Zod
│   │       ├── user.repository.ts  # Accès DB (Prisma)
│   │       ├── user.service.ts     # Logique métier
│   │       ├── user.controller.ts  # Handlers HTTP
│   │       └── index.ts            # Exports
│   │
│   ├── shared/           # Code partagé
│   │   ├── types/        # Types communs
│   │   ├── utils/        # Utilitaires
│   │   └── constants/    # Constantes
│   │
│   └── lib/
│       └── database.ts   # Client Prisma
│
├── components/           # Composants React
│   └── ui/               # shadcn/ui components
│
└── lib/
    └── utils.ts          # Utilitaires client

prisma/
└── schema.prisma         # Schema base de données
```

## Créer un Nouveau Domaine

1. Créer le dossier: `src/server/domains/product/`

2. Définir le schema Prisma dans `prisma/schema.prisma`:

```prisma
model Product {
  id        String   @id @default(cuid())
  name      String
  price     Float
  category  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("products")
}
```

3. Générer le client:

```bash
npx prisma generate
npx prisma db push
```

4. Créer les fichiers du domaine:

- `product.types.ts` - Types basés sur Prisma
- `product.schemas.ts` - Validation Zod
- `product.repository.ts` - Requêtes DB
- `product.service.ts` - Logique métier
- `product.controller.ts` - Handlers HTTP
- `index.ts` - Exports et singletons

5. Créer les routes API dans `src/app/api/products/`

Voir `CLAUDE.md` pour le template complet.

## Variables d'Environnement

Copier `.env.example` vers `.env` et configurer:

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# API
API_URL="http://localhost:3000"
NODE_ENV="development"

# Auth (optionnel)
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
```

## Git Hooks

Les hooks Husky sont automatiquement installés:

- **pre-commit**: Exécute lint-staged
  - ESLint --fix sur fichiers TS/JS
  - Prettier --write sur tous les fichiers

Pour bypasser (déconseillé):

```bash
git commit --no-verify
```

## Scripts npm

```bash
npm run dev          # Serveur de développement
npm run build        # Build production
npm start            # Serveur production
npm run lint         # Vérifier erreurs ESLint
npm run lint:fix     # Corriger erreurs ESLint
npm run format       # Formatter le code
npm run format:check # Vérifier le formatage
```

## Documentation

Consulter `CLAUDE.md` pour:

- Architecture détaillée
- Best practices TypeScript
- Patterns de développement
- Guide de création de domaines
- Recommendations d'amélioration

## Troubleshooting

### Erreur "Prisma Client not found"

```bash
npx prisma generate
```

### Erreur de connexion base de données

Vérifier que `DATABASE_URL` dans `.env` est correct et que Neon est accessible.

### ESLint/Prettier conflits

```bash
npm run lint:fix
npm run format
```

### Hot reload ne fonctionne pas

Redémarrer le serveur de développement ou le container Docker.
