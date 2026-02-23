# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Notavex web application built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, and shadcn/ui components.

## Tech Stack

- **Framework**: Next.js 16.1.6 with App Router
- **Runtime**: React 19.2.3
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4 with @tailwindcss/postcss
- **UI Components**: shadcn/ui (New York style, Neutral color, Lucide icons)
- **Containerization**: Docker with multi-stage builds

## Development Commands

### Local Development (without Docker)

```bash
npm run dev       # Start development server on http://localhost:3000
npm run build     # Build production bundle (creates .next/standalone)
npm start         # Start production server (requires build first)
npm run lint      # Run ESLint
```

### Docker Development (recommended)

```bash
docker compose up                       # Start dev container on http://localhost:3000
docker compose up -d                    # Start in detached mode
docker compose down                     # Stop and remove container
docker compose logs -f web-dev          # View dev container logs
docker compose restart web-dev          # Restart dev container
```

### Docker Production

```bash
docker compose --profile production up web-prod        # Start production container on http://localhost:3001
docker compose --profile production up -d web-prod     # Start in detached mode
docker compose --profile production down               # Stop production container
docker compose --profile production logs -f web-prod   # View production logs
```

## Project Structure

```
src/
  app/
    api/              # API routes (HTTP endpoints)
      users/
        route.ts      # GET /api/users, POST /api/users
        [id]/
          route.ts    # GET/PATCH/DELETE /api/users/:id
    globals.css       # Tailwind CSS imports and theme variables
    layout.tsx        # Root layout with metadata

  server/             # Server-side code (domain-driven)
    domains/          # Business domains
      user/
        user.types.ts        # Domain types
        user.repository.ts   # Data access layer
        user.service.ts      # Business logic
        user.controller.ts   # HTTP request handlers
        index.ts             # Exports + singleton instances

    shared/           # Shared utilities and types
      types/
        api.types.ts         # API response types
        common.types.ts      # Common utility types
        index.ts
      utils/
        api.utils.ts         # Response builders, error handlers
        index.ts
      constants/
        http.constants.ts    # HTTP status codes, error codes

    lib/              # External clients (database, APIs, etc.)

  components/         # React components
    ui/               # shadcn/ui components

  lib/
    utils.ts          # Client-side utilities

public/               # Static assets
```

## Configuration Files

- **next.config.ts**: Next.js config with `output: "standalone"` for Docker
- **components.json**: shadcn/ui configuration
  - Style: new-york
  - Base color: neutral
  - Icon library: lucide
  - RSC: enabled
  - Aliases: @/src/components, @/src/lib/utils, @/src/hooks
- **postcss.config.mjs**: Tailwind CSS v4 PostCSS plugin
- **tsconfig.json**: TypeScript configuration with path aliases (@/\*)
- **eslint.config.mjs**: ESLint v9 configuration

## Adding shadcn/ui Components

```bash
npx shadcn@latest add button           # Add a single component
npx shadcn@latest add button card      # Add multiple components
npx shadcn@latest diff button          # Check for component updates
```

Components are copied to `src/components/ui/` and can be customized directly.

## Key Architectural Notes

- **App Router**: Using Next.js App Router (not Pages Router)
- **Server Components**: RSC enabled by default, use "use client" for client components
- **Tailwind v4**: Uses new `@import "tailwindcss"` syntax and `@theme inline` directive
- **Standalone Output**: Docker build uses standalone mode for minimal image size
- **Import Aliases**: `@/*` maps to src directory (configured in tsconfig.json)
- **Src Directory**: All application code is inside the `src/` directory
- **Domain-Driven Design**: Server code organized by business domains
- **Layered Architecture**: Controller → Service → Repository pattern

## Server-Side Architecture

### Architecture Pattern: Domain-Driven Design (DDD)

All server-side code is organized in `/src/server` with clear separation of concerns:

**Layered Architecture:**

```
API Route (app/api) → Controller → Service → Repository → Database
```

### Domain Structure

Each business domain (user, product, order, etc.) follows this structure:

```
src/server/domains/{domain}/
├── {domain}.types.ts       # TypeScript types and interfaces
├── {domain}.repository.ts  # Data access layer (CRUD operations)
├── {domain}.service.ts     # Business logic and validation
├── {domain}.controller.ts  # HTTP request/response handlers
└── index.ts                # Exports and singleton instances
```

### Layer Responsibilities

#### 1. Types (`{domain}.types.ts`)

- Define domain entities and DTOs
- Use utility types for DRY principle
- Separate concerns: Entity, CreateDTO, UpdateDTO, Filters

```typescript
import type { Entity, CreateDTO, UpdateDTO } from '@/server/shared/types'

export type User = {
  email: string
  name: string
  role: UserRole
}

export type UserEntity = Entity<User> // Adds id, createdAt, updatedAt
export type CreateUserDTO = CreateDTO<User> // Omits id, timestamps
export type UpdateUserDTO = UpdateDTO<User> // Partial CreateUserDTO
```

#### 2. Repository (`{domain}.repository.ts`)

- Data access layer (database queries)
- CRUD operations only
- No business logic
- Returns entities or null

```typescript
export class UserRepository {
  async findById(id: ID): Promise<UserEntity | null> {}
  async findAll(filters?: Filters): Promise<UserEntity[]> {}
  async create(data: CreateUserDTO): Promise<UserEntity> {}
  async update(id: ID, data: UpdateUserDTO): Promise<UserEntity | null> {}
  async delete(id: ID): Promise<boolean> {}
}
```

#### 3. Service (`{domain}.service.ts`)

- Business logic and validation
- Orchestrates repository calls
- Throws `ApiError` for error cases
- Domain-specific operations

```typescript
export class UserService {
  constructor(private repository: UserRepository) {}

  async createUser(data: CreateUserDTO): Promise<UserEntity> {
    // Validation logic
    const existing = await this.repository.findByEmail(data.email)
    if (existing) {
      throw new ApiError('CONFLICT', HTTP_STATUS.CONFLICT, 'Email exists')
    }

    // Business logic
    return this.repository.create(data)
  }
}
```

#### 4. Controller (`{domain}.controller.ts`)

- HTTP request/response handling
- Extract parameters and body
- Call service methods
- Return formatted responses (success or error)

```typescript
export class UserController {
  constructor(private service: UserService) {}

  async createUser(request: NextRequest) {
    try {
      const body = (await request.json()) as CreateUserDTO
      const user = await this.service.createUser(body)
      return createSuccessResponse(user, HTTP_STATUS.CREATED)
    } catch (error) {
      return handleApiError(error)
    }
  }
}
```

#### 5. Index (`index.ts`)

- Export all domain types
- Create singleton instances
- Dependency injection

```typescript
const userRepository = new UserRepository()
const userService = new UserService(userRepository)
export const userController = new UserController(userService)

export * from './user.types'
```

### API Routes

Routes in `/src/app/api` are minimal and delegate to controllers:

```typescript
// app/api/users/route.ts
import { userController } from '@/server/domains/user'

export async function GET(request: NextRequest) {
  return userController.getUsers(request)
}

export async function POST(request: NextRequest) {
  return userController.createUser(request)
}
```

### Shared Utilities

#### Types (`/src/server/shared/types`)

**api.types.ts** - API response patterns:

- `ApiResponse<T>` - Discriminated union (success/error)
- `PaginatedData<T>` - Pagination wrapper
- `PaginationParams`, `SortParams`, `FilterParams`

**common.types.ts** - Reusable utility types:

- `Entity<T>` - Adds id and timestamps
- `CreateDTO<T>` - Omits id and timestamps
- `UpdateDTO<T>` - Partial CreateDTO
- `WithRequired<T, K>` - Make specific fields required
- `WithOptional<T, K>` - Make specific fields optional

#### Utils (`/src/server/shared/utils`)

**api.utils.ts** - Response builders and error handling:

- `createSuccessResponse<T>(data, status)` - Build success response
- `createErrorResponse(code, message, details, status)` - Build error response
- `ApiError` - Custom error class
- `handleApiError(error)` - Centralized error handler

#### Constants (`/src/server/shared/constants`)

**http.constants.ts** - Avoid magic strings:

- `HTTP_STATUS` - Status codes (200, 201, 400, 404, etc.)
- `ERROR_CODES` - Error identifiers
- `ERROR_MESSAGES` - Default error messages

### TypeScript Best Practices

1. **Use Utility Types** - Avoid duplication with `Pick`, `Omit`, `Partial`, `Required`
2. **Discriminated Unions** - Type-safe API responses with `success: boolean`
3. **Const Assertions** - Use `as const` for constants
4. **Generic Types** - Reusable patterns like `Entity<T>`, `ApiResponse<T>`
5. **Type Inference** - Let TypeScript infer when possible
6. **Readonly** - Use for immutable data (DTOs from client)
7. **Strict Null Checks** - Repository returns `T | null`, service throws errors

### Creating a New Domain

Template for creating a new domain (example: `product`):

1. Create directory: `src/server/domains/product/`

2. **product.types.ts**:

```typescript
import type { Entity, CreateDTO, UpdateDTO } from '@/server/shared/types'

export type Product = {
  name: string
  price: number
  category: string
}

export type ProductEntity = Entity<Product>
export type CreateProductDTO = CreateDTO<Product>
export type UpdateProductDTO = UpdateDTO<Product>
```

3. **product.repository.ts**:

```typescript
export class ProductRepository {
  async findAll(): Promise<ProductEntity[]> {
    return []
  }
  async findById(id: ID): Promise<ProductEntity | null> {
    return null
  }
  async create(data: CreateProductDTO): Promise<ProductEntity> {}
  async update(id: ID, data: UpdateProductDTO): Promise<ProductEntity | null> {}
  async delete(id: ID): Promise<boolean> {
    return false
  }
}
```

4. **product.service.ts**:

```typescript
export class ProductService {
  constructor(private repository: ProductRepository) {}

  async getProducts(): Promise<ProductEntity[]> {
    return this.repository.findAll()
  }

  async createProduct(data: CreateProductDTO): Promise<ProductEntity> {
    return this.repository.create(data)
  }
}
```

5. **product.controller.ts**:

```typescript
export class ProductController {
  constructor(private service: ProductService) {}

  async getProducts(request: NextRequest) {
    try {
      const products = await this.service.getProducts()
      return createSuccessResponse(products)
    } catch (error) {
      return handleApiError(error)
    }
  }
}
```

6. **index.ts**:

```typescript
import { ProductRepository } from './product.repository'
import { ProductService } from './product.service'
import { ProductController } from './product.controller'

const productRepository = new ProductRepository()
const productService = new ProductService(productRepository)
export const productController = new ProductController(productService)

export * from './product.types'
```

7. Create API routes: `src/app/api/products/route.ts`

## Docker Architecture

### Development Container (Dockerfile.dev)

- Single-stage build with Node.js 24.13.0-slim
- Volume mounts for hot reloading:
  - `.:/app` - Source code sync
  - `/app/node_modules` - Preserve installed packages
  - `/app/.next` - Preserve build cache
- Runs `npm run dev` with hot module replacement
- Exposed on port 3000

### Production Container (Dockerfile)

- Multi-stage build with three stages:
  1. **deps**: Install dependencies with npm cache
  2. **builder**: Build Next.js application with build cache
  3. **runner**: Minimal production runtime (node:24.13.0-slim)
- Runs as non-root user (nextjs:nodejs)
- Uses standalone output mode for minimal image size
- Exposed on port 3001 (via docker-compose profile)

## Environment Variables

Create `.env.local` for local development (not committed to git):

```
# Add your environment variables here
```

Docker production requires passing environment variables via docker-compose.yml or docker run -e flags.

## Styling with Tailwind v4

- Global CSS variables defined in `src/app/globals.css` under `:root` and `@theme inline`
- Dark mode support via `prefers-color-scheme: dark`
- Custom fonts: Geist Sans and Geist Mono (configured in layout.tsx)
- Use `cn()` utility from `@/lib/utils` to merge Tailwind classes conditionally

## Recommended Enhancements

### 1. Input Validation with Zod

Add runtime validation for incoming DTOs:

```bash
npm install zod
```

Example validation schema:

```typescript
// src/server/domains/user/user.schemas.ts
import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['admin', 'user', 'guest']),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
```

Use in controller:

```typescript
async createUser(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createUserSchema.parse(body); // Throws if invalid
    const user = await this.service.createUser(validated);
    return createSuccessResponse(user, HTTP_STATUS.CREATED);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse("VALIDATION_ERROR", "Invalid input", error.errors);
    }
    return handleApiError(error);
  }
}
```

### 2. Database Integration

Choose and configure an ORM:

**Option A: Prisma** (recommended for PostgreSQL/MySQL)

```bash
npm install prisma @prisma/client
npx prisma init
```

**Option B: Drizzle ORM** (lighter, TypeScript-first)

```bash
npm install drizzle-orm
npm install -D drizzle-kit
```

Update repository to use database client:

```typescript
// src/server/lib/database.ts
import { PrismaClient } from '@prisma/client'

export const db = new PrismaClient()

// src/server/domains/user/user.repository.ts
import { db } from '@/server/lib/database'

export class UserRepository {
  async findById(id: ID): Promise<UserEntity | null> {
    return db.user.findUnique({ where: { id } })
  }
}
```

### 3. Environment Variables

Create `.env.example`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/notavex"

# API
API_URL="http://localhost:3000"

# Authentication (if using)
JWT_SECRET="your-secret-key"
```

Access in code:

```typescript
// src/server/lib/env.ts
export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  API_URL: process.env.API_URL!,
  JWT_SECRET: process.env.JWT_SECRET,
} as const
```

### 4. Request Logging Middleware

Create a logging utility:

```typescript
// src/server/shared/utils/logger.utils.ts
export const logger = {
  info: (message: string, meta?: unknown) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta)
  },
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error)
  },
}
```

Use in controllers:

```typescript
async getUsers(request: NextRequest) {
  logger.info(`GET /api/users`, { url: request.url });
  try {
    const data = await this.service.getUsers();
    return createSuccessResponse(data);
  } catch (error) {
    logger.error("Failed to get users", error);
    return handleApiError(error);
  }
}
```

### 5. Rate Limiting

Protect APIs from abuse:

```bash
npm install @upstash/ratelimit @upstash/redis
```

Create middleware:

```typescript
// src/server/shared/middleware/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
})

export async function checkRateLimit(identifier: string) {
  const { success } = await ratelimit.limit(identifier)
  return success
}
```

### 6. Testing Structure

Organize tests alongside domains:

```
src/server/domains/user/
├── user.types.ts
├── user.repository.ts
├── user.service.ts
├── user.controller.ts
├── index.ts
└── __tests__/
    ├── user.service.test.ts
    ├── user.repository.test.ts
    └── user.controller.test.ts
```

Install testing tools:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

Example test:

```typescript
// src/server/domains/user/__tests__/user.service.test.ts
import { describe, it, expect, vi } from 'vitest'
import { UserService } from '../user.service'
import { UserRepository } from '../user.repository'

describe('UserService', () => {
  it('should create user successfully', async () => {
    const mockRepo = new UserRepository()
    vi.spyOn(mockRepo, 'findByEmail').mockResolvedValue(null)
    vi.spyOn(mockRepo, 'create').mockResolvedValue({
      id: 1,
      email: 'test@test.com',
    })

    const service = new UserService(mockRepo)
    const result = await service.createUser({
      email: 'test@test.com',
      name: 'Test',
    })

    expect(result.email).toBe('test@test.com')
  })
})
```

### 7. API Documentation

Consider adding OpenAPI/Swagger documentation:

```bash
npm install next-swagger-doc swagger-ui-react
```

Generate API docs from your types and routes.

## Development Workflow

### Adding a New Feature

1. **Define types** in `{domain}.types.ts`
2. **Implement repository** methods in `{domain}.repository.ts`
3. **Add business logic** in `{domain}.service.ts`
4. **Create controller** methods in `{domain}.controller.ts`
5. **Wire up singleton** in `index.ts`
6. **Create API route** in `app/api/{resource}/route.ts`
7. **Add validation** schemas (optional but recommended)
8. **Write tests** for service and repository layers

### Code Review Checklist

- [ ] Types are properly defined and use utility types (no duplication)
- [ ] Repository only contains data access (no business logic)
- [ ] Service contains validation and business logic
- [ ] Controller handles HTTP concerns only
- [ ] Errors are properly typed and handled
- [ ] API responses follow the standard format
- [ ] No magic strings (use constants)
- [ ] Import paths use `@/` alias
- [ ] Code follows the DRY principle

## Common Patterns

### Handling Relations

```typescript
// user.types.ts
export type User = {
  email: string;
  name: string;
  posts?: Post[];  // Optional relation
};

// service.ts
async getUserWithPosts(id: ID): Promise<UserEntity & { posts: Post[] }> {
  const user = await this.repository.findById(id);
  const posts = await postRepository.findByUserId(id);
  return { ...user, posts };
}
```

### Soft Deletes

```typescript
// common.types.ts
export type SoftDeletable = {
  deletedAt: Date | null;
};

// repository.ts
async delete(id: ID): Promise<boolean> {
  await db.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return true;
}
```

### Bulk Operations

```typescript
// service.ts
async createBulk(items: CreateUserDTO[]): Promise<UserEntity[]> {
  return Promise.all(items.map(item => this.create(item)));
}
```
