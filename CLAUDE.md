# CLAUDE.md

## ⚠ MANDATORY RULES — Check before every task

### Frontend

- **page.tsx MUST be thin** — NEVER put `useState`, `useEffect`, data fetching, or any logic in `page.tsx`
- **ALWAYS** extract ALL state, effects, and data fetching into a `use{Feature}.ts` custom hook
- **page.tsx** imports and renders components only — no inline JSX logic, no conditional rendering blocks
- **ALWAYS** create dedicated components — one file per component, named `PascalCase.tsx`

❌ Wrong:

```tsx
// page.tsx
export default function Page() {
  const [data, setData] = useState([])
  useEffect(() => { fetch(...).then(setData) }, [])
  return <div>{data.map(...)}</div>
}
```

✅ Correct:

```tsx
// useFeature.ts  ← all logic here
// FeatureList.tsx ← component
// page.tsx ← thin shell
export default function Page() {
  return <FeatureList />
}
```

### Backend

- **ALWAYS** follow `Controller → Service → Repository` — **NEVER skip layers**
- Controllers: HTTP only (parse request, call service, return response)
- Services: business logic and validation, throw `ApiError` for errors
- Repositories: data access only — no business logic
- **ALWAYS** create `__tests__/` with a test file when creating a domain service or repository
- New domain = 6 files minimum: `types`, `repository`, `service`, `controller`, `index`, `__tests__/{domain}.service.test.ts`

### General

- No comments unless the WHY is non-obvious
- Always use `@/` import aliases — never relative paths from `src/`
- Run `npm run check` before finishing any task
- No magic strings — use `HTTP_STATUS` and `ERROR_CODES` constants

---

## Project

Next.js 16, React 19, TypeScript 5, Tailwind v4, shadcn/ui (New York/Neutral/Lucide), Prisma ORM, Stripe (TEST dev / LIVE prod).

## Dev Commands

```bash
npm run dev          # Start dev server http://localhost:3000
npm run check        # format + lint + type-check — run before committing
npm run lint:fix     # Auto-fix ESLint issues
npm run type-check   # TypeScript only
npm test             # Run all tests
npm run test:watch   # Watch mode
docker compose up    # Dev with Docker
```

## Project Structure

```
src/
  app/
    api/              # API routes — delegate only to controllers
    (dashboard)/      # Protected dashboard pages
    (landing)/        # Public pages
    globals.css
    layout.tsx
  server/
    domains/          # Business domains (DDD)
      {domain}/
        {domain}.types.ts
        {domain}.schemas.ts     # Zod validation
        {domain}.repository.ts
        {domain}.service.ts
        {domain}.controller.ts
        index.ts                # Singleton exports
        __tests__/
          {domain}.service.test.ts
    shared/
      types/           # ApiResponse<T>, Entity<T>, CreateDTO<T>...
      utils/           # createSuccessResponse, handleApiError, ApiError
      constants/       # HTTP_STATUS, ERROR_CODES
    lib/               # External clients (Prisma, Stripe...)
  components/
    ui/                # shadcn/ui components
    {feature}/         # Feature components (PascalCase.tsx)
  hooks/               # Shared custom hooks
  lib/
    utils.ts           # cn() utility
```

## Architecture: Controller → Service → Repository

```
API Route → Controller → Service → Repository → Prisma
```

API routes delegate to controller only:

```ts
// app/api/users/route.ts
export async function GET(req: NextRequest) {
  return userController.getUsers(req)
}
```

Use `createSuccessResponse` / `handleApiError` from `@/server/shared/utils`.
Use `ApiError` to throw domain errors in services.

## Authentication & Roles

**Stack**: NextAuth v5 (JWT strategy) + Prisma adapter. Providers: Google + Credentials.

### Protecting API routes — always use middleware helpers from `@/server/shared/middleware/auth.middleware`

| Function                        | Use when                                                             |
| ------------------------------- | -------------------------------------------------------------------- |
| `requireAuth()`                 | Any authenticated route — throws `ApiError UNAUTHORIZED`             |
| `requireAdminAuth()`            | Admin-only routes — **re-fetches role from DB**, impersonation-aware |
| `requireEmailVerified()`        | Sensitive actions requiring verified email                           |
| `requireRole(['admin', 'pro'])` | Multi-role access control                                            |
| `validateApiAuth(request)`      | When you need a `NextResponse` instead of a throw                    |

```ts
// ✅ Standard authenticated controller method
async getMyData(req: NextRequest) {
  try {
    const session = await requireAuth()
    // session.user.id, session.user.role available
    ...
  } catch (error) { return handleApiError(error) }
}

// ✅ Admin-only — ALWAYS use requireAdminAuth(), never check session.user.role === 'admin' directly
async adminAction(req: NextRequest) {
  try {
    const session = await requireAdminAuth()  // hits DB, impersonation-aware
    ...
  } catch (error) { return handleApiError(error) }
}
```

### Rules

- **NEVER** check `session.user.role === 'admin'` directly in controllers — always use `requireAdminAuth()`
- **NEVER** trust JWT role alone for admin actions — `requireAdminAuth()` re-fetches from DB to prevent stale JWT exploit
- **NEVER** expose `session.user.id` of an impersonated user as the acting admin — use `session.impersonation?.adminId` for audit logs
- Route-level protection lives in `src/middleware.ts` — add new protected prefixes there, not in individual pages
- **Frontend role checks are UI-only** — never use `session.user.role` to gate actual data, only to show/hide UI elements
- Email verification required for sensitive actions — use `requireEmailVerified()`

### Session shape (from `src/types/next-auth.d.ts`)

```ts
session.user.id            // string
session.user.role          // 'admin' | 'user' | ...
session.user.emailVerified // Date | null
session.impersonation?     // { isActive, adminId, adminEmail, sessionId }
```

### Frontend session access

```ts
// In hooks/components — use NextAuth's hook
import { useSession } from 'next-auth/react'
const { data: session } = useSession()

// In Server Components / API routes — use auth()
import { auth } from '@/server/lib/auth'
const session = await auth()
```

---

## Custom Commands

- `/new-domain-tdd` — scaffold a full domain with TDD
- `/feature-architect` — scaffold end-to-end feature (domain + frontend)
- `/smart-commit` — commit with conventional message

## Naming Conventions

| Pattern                | Use for                                   |
| ---------------------- | ----------------------------------------- |
| `PascalCase`           | Components, Types, Classes, Enums         |
| `camelCase`            | Variables, functions, hooks, props        |
| `SCREAMING_SNAKE_CASE` | Constants, env vars                       |
| `kebab-case`           | CSS classes, file/folder names for routes |

File names:

- Components: `HeroSection.tsx`, `AudioPlayer.tsx`
- Server files: `user.service.ts`, `user.repository.ts`
- Hooks: `usePartitions.ts`, `useSubscription.ts`
- Route files: `page.tsx`, `layout.tsx`, `route.ts`

## Adding shadcn/ui Components

```bash
npx shadcn@latest add button
```

Components land in `src/components/ui/` — customize directly.

## Environment

- `.env` → development (Stripe TEST keys, localhost)
- `.env.production` → production (Stripe LIVE keys, domain)
- `DATABASE_URL`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` required
