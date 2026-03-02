# Skill: Create New Domain with TDD

This skill creates a new business domain following Test-Driven Development (TDD) methodology and Notavex architecture patterns.

## TDD Philosophy

**Red → Green → Refactor**

1. **RED**: Write a failing test first
2. **GREEN**: Write minimal code to make it pass
3. **REFACTOR**: Improve code quality while keeping tests green

## Instructions

You are creating a new domain using **Test-Driven Development**. Follow this exact order:

### Step 1: Gather Requirements

Ask the user:

1. **Domain name** (singular, lowercase, e.g., "product", "subscription", "playlist")
2. **Core fields** for the entity:
   ```
   Example for "product":
   - name: string
   - description: string
   - price: number
   - category: string
   - inStock: boolean
   ```
3. **Optional features**:
   - Pagination? (yes/no)
   - Soft delete? (yes/no)
   - Search/filters? (yes/no)
   - Role-based access? (admin only, user only, etc.)

### Step 2: Create Types First (No tests needed)

**File**: `src/server/domains/{domain}/{domain}.types.ts`

```typescript
import type { Entity, CreateDTO, UpdateDTO } from '@/server/shared/types'

export type Product = {
  name: string
  description: string
  price: number
  category: string
  inStock: boolean
}

export type ProductEntity = Entity<Product>
export type CreateProductDTO = CreateDTO<Product>
export type UpdateProductDTO = UpdateDTO<Product>
```

### Step 3: Create Validation Schemas

**File**: `src/server/domains/{domain}/{domain}.schemas.ts`

Use Zod for runtime validation:

```typescript
import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(500),
  price: z.number().positive(),
  category: z.string().min(2).max(50),
  inStock: z.boolean(),
})

export const updateProductSchema = createProductSchema.partial()

export const productIdSchema = z.string().uuid()

export const getProductsQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
})
```

### Step 4: TDD Cycle - Repository Layer

#### 4.1 Write Repository Tests FIRST (RED)

**File**: `src/server/domains/{domain}/__tests__/{domain}.repository.test.ts`

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductRepository } from '../product.repository'

vi.mock('@/server/lib/database', () => ({
  db: {
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { db } from '@/server/lib/database'

describe('ProductRepository', () => {
  let repository: ProductRepository

  beforeEach(() => {
    repository = new ProductRepository()
    vi.clearAllMocks()
  })

  describe('findAll', () => {
    it('should return all products', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', price: 100 /* ... */ },
        { id: '2', name: 'Product 2', price: 200 /* ... */ },
      ]

      vi.mocked(db.product.findMany).mockResolvedValue(mockProducts)

      const result = await repository.findAll()

      expect(result).toEqual(mockProducts)
      expect(db.product.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('findById', () => {
    it('should return product by id', async () => {
      const mockProduct = { id: '1', name: 'Product 1' /* ... */ }

      vi.mocked(db.product.findUnique).mockResolvedValue(mockProduct)

      const result = await repository.findById('1')

      expect(result).toEqual(mockProduct)
      expect(db.product.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      })
    })

    it('should return null if product not found', async () => {
      vi.mocked(db.product.findUnique).mockResolvedValue(null)

      const result = await repository.findById('999')

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create new product', async () => {
      const createData = {
        name: 'New Product',
        description: 'Description',
        price: 99.99,
        category: 'Electronics',
        inStock: true,
      }

      const mockCreated = {
        id: '1',
        ...createData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.product.create).mockResolvedValue(mockCreated)

      const result = await repository.create(createData)

      expect(result).toEqual(mockCreated)
      expect(db.product.create).toHaveBeenCalledWith({
        data: createData,
      })
    })
  })

  describe('update', () => {
    it('should update product', async () => {
      const updateData = { price: 150 }
      const mockUpdated = { id: '1', name: 'Product', price: 150 /* ... */ }

      vi.mocked(db.product.update).mockResolvedValue(mockUpdated)

      const result = await repository.update('1', updateData)

      expect(result).toEqual(mockUpdated)
      expect(db.product.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
      })
    })

    it('should return null if product not found', async () => {
      vi.mocked(db.product.update).mockRejectedValue(new Error('Not found'))

      const result = await repository.update('999', { price: 100 })

      expect(result).toBeNull()
    })
  })

  describe('delete', () => {
    it('should delete product', async () => {
      vi.mocked(db.product.delete).mockResolvedValue({ id: '1' /* ... */ })

      const result = await repository.delete('1')

      expect(result).toBe(true)
      expect(db.product.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      })
    })

    it('should return false if product not found', async () => {
      vi.mocked(db.product.delete).mockRejectedValue(new Error('Not found'))

      const result = await repository.delete('999')

      expect(result).toBe(false)
    })
  })
})
```

**Run tests**: `npm run test` → **They should FAIL (RED)**

#### 4.2 Implement Repository (GREEN)

**File**: `src/server/domains/{domain}/{domain}.repository.ts`

```typescript
import { db } from '@/server/lib/database'
import type {
  CreateProductDTO,
  UpdateProductDTO,
  ProductEntity,
} from './product.types'

export class ProductRepository {
  async findAll(): Promise<ProductEntity[]> {
    return db.product.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(id: string): Promise<ProductEntity | null> {
    return db.product.findUnique({
      where: { id },
    })
  }

  async create(data: CreateProductDTO): Promise<ProductEntity> {
    return db.product.create({
      data,
    })
  }

  async update(
    id: string,
    data: UpdateProductDTO,
  ): Promise<ProductEntity | null> {
    try {
      return await db.product.update({
        where: { id },
        data,
      })
    } catch (error) {
      return null
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await db.product.delete({
        where: { id },
      })
      return true
    } catch (error) {
      return false
    }
  }
}
```

**Run tests**: `npm run test` → **They should PASS (GREEN)**

### Step 5: TDD Cycle - Service Layer

#### 5.1 Write Service Tests FIRST (RED)

**File**: `src/server/domains/{domain}/__tests__/{domain}.service.test.ts`

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils'
import { ProductRepository } from '../product.repository'
import { ProductService } from '../product.service'

describe('ProductService', () => {
  let service: ProductService
  let mockRepository: ProductRepository

  beforeEach(() => {
    mockRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as any

    service = new ProductService(mockRepository)
    vi.clearAllMocks()
  })

  describe('getProducts', () => {
    it('should return all products', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', price: 100 },
        { id: '2', name: 'Product 2', price: 200 },
      ]

      vi.mocked(mockRepository.findAll).mockResolvedValue(mockProducts as any)

      const result = await service.getProducts()

      expect(result).toEqual(mockProducts)
      expect(mockRepository.findAll).toHaveBeenCalled()
    })
  })

  describe('getProductById', () => {
    it('should return product by id', async () => {
      const mockProduct = { id: '1', name: 'Product 1', price: 100 }

      vi.mocked(mockRepository.findById).mockResolvedValue(mockProduct as any)

      const result = await service.getProductById('1')

      expect(result).toEqual(mockProduct)
    })

    it('should throw NOT_FOUND error if product does not exist', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(service.getProductById('999')).rejects.toThrow(ApiError)
      await expect(service.getProductById('999')).rejects.toThrow(
        'Product not found',
      )

      try {
        await service.getProductById('999')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.NOT_FOUND)
      }
    })
  })

  describe('createProduct', () => {
    it('should create new product', async () => {
      const createData = {
        name: 'New Product',
        description: 'Description',
        price: 99.99,
        category: 'Electronics',
        inStock: true,
      }

      const mockCreated = { id: '1', ...createData }

      vi.mocked(mockRepository.create).mockResolvedValue(mockCreated as any)

      const result = await service.createProduct(createData)

      expect(result).toEqual(mockCreated)
      expect(mockRepository.create).toHaveBeenCalledWith(createData)
    })
  })

  describe('updateProduct', () => {
    it('should update existing product', async () => {
      const updateData = { price: 150 }
      const mockUpdated = { id: '1', name: 'Product', price: 150 }

      vi.mocked(mockRepository.update).mockResolvedValue(mockUpdated as any)

      const result = await service.updateProduct('1', updateData)

      expect(result).toEqual(mockUpdated)
    })

    it('should throw NOT_FOUND if product does not exist', async () => {
      vi.mocked(mockRepository.update).mockResolvedValue(null)

      await expect(
        service.updateProduct('999', { price: 100 }),
      ).rejects.toThrow(ApiError)
    })
  })

  describe('deleteProduct', () => {
    it('should delete product', async () => {
      vi.mocked(mockRepository.delete).mockResolvedValue(true)

      await service.deleteProduct('1')

      expect(mockRepository.delete).toHaveBeenCalledWith('1')
    })

    it('should throw NOT_FOUND if product does not exist', async () => {
      vi.mocked(mockRepository.delete).mockResolvedValue(false)

      await expect(service.deleteProduct('999')).rejects.toThrow(ApiError)
    })
  })
})
```

**Run tests**: `npm run test` → **FAIL (RED)**

#### 5.2 Implement Service (GREEN)

**File**: `src/server/domains/{domain}/{domain}.service.ts`

```typescript
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils'
import type { ProductRepository } from './product.repository'
import type {
  CreateProductDTO,
  UpdateProductDTO,
  ProductEntity,
} from './product.types'

export class ProductService {
  constructor(private repository: ProductRepository) {}

  async getProducts(): Promise<ProductEntity[]> {
    return this.repository.findAll()
  }

  async getProductById(id: string): Promise<ProductEntity> {
    const product = await this.repository.findById(id)

    if (!product) {
      throw new ApiError(
        'NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Product not found',
      )
    }

    return product
  }

  async createProduct(data: CreateProductDTO): Promise<ProductEntity> {
    return this.repository.create(data)
  }

  async updateProduct(
    id: string,
    data: UpdateProductDTO,
  ): Promise<ProductEntity> {
    const product = await this.repository.update(id, data)

    if (!product) {
      throw new ApiError(
        'NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Product not found',
      )
    }

    return product
  }

  async deleteProduct(id: string): Promise<void> {
    const deleted = await this.repository.delete(id)

    if (!deleted) {
      throw new ApiError(
        'NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Product not found',
      )
    }
  }
}
```

**Run tests**: `npm run test` → **PASS (GREEN)**

### Step 6: TDD Cycle - Controller Layer

#### 6.1 Write Controller Tests FIRST (RED)

**File**: `src/server/domains/{domain}/__tests__/{domain}.controller.test.ts`

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { ProductController } from '../product.controller'
import { ProductService } from '../product.service'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'

vi.mock('@/server/shared/middleware', () => ({
  validateApiAuth: vi.fn().mockResolvedValue({
    session: { user: { id: '1', email: 'test@test.com', role: 'user' } },
  }),
}))

describe('ProductController', () => {
  let controller: ProductController
  let mockService: ProductService

  beforeEach(() => {
    mockService = {
      getProducts: vi.fn(),
      getProductById: vi.fn(),
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      deleteProduct: vi.fn(),
    } as any

    controller = new ProductController(mockService)
    vi.clearAllMocks()
  })

  describe('getProducts', () => {
    it('should return products list', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1' },
        { id: '2', name: 'Product 2' },
      ]

      vi.mocked(mockService.getProducts).mockResolvedValue(mockProducts as any)

      const request = new NextRequest('http://localhost/api/products')
      const response = await controller.getProducts(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockProducts)
    })
  })

  describe('createProduct', () => {
    it('should create new product', async () => {
      const createData = {
        name: 'New Product',
        description: 'Description',
        price: 99.99,
        category: 'Electronics',
        inStock: true,
      }

      const mockCreated = { id: '1', ...createData }

      vi.mocked(mockService.createProduct).mockResolvedValue(mockCreated as any)

      const request = new NextRequest('http://localhost/api/products', {
        method: 'POST',
        body: JSON.stringify(createData),
      })

      const response = await controller.createProduct(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.CREATED)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockCreated)
    })

    it('should return validation error for invalid data', async () => {
      const invalidData = { name: 'x' } // Too short

      const request = new NextRequest('http://localhost/api/products', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      })

      const response = await controller.createProduct(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })
})
```

**Run tests**: `npm run test` → **FAIL (RED)**

#### 6.2 Implement Controller (GREEN)

**File**: `src/server/domains/{domain}/{domain}.controller.ts`

```typescript
import { NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
} from '@/server/shared/utils'
import { validateApiAuth } from '@/server/shared/middleware'
import {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
} from './product.schemas'
import type { ProductService } from './product.service'

export class ProductController {
  constructor(private service: ProductService) {}

  async getProducts(request: NextRequest) {
    const { session, response } = await validateApiAuth(request)
    if (response) return response

    try {
      const products = await this.service.getProducts()
      return createSuccessResponse(products)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async getProductById(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const { session, response } = await validateApiAuth(request)
    if (response) return response

    try {
      const { id } = await params
      const validatedId = productIdSchema.parse(id)
      const product = await this.service.getProductById(validatedId)
      return createSuccessResponse(product)
    } catch (error) {
      if (error instanceof ZodError) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid product ID',
          error.issues,
          HTTP_STATUS.BAD_REQUEST,
        )
      }
      return handleApiError(error)
    }
  }

  async createProduct(request: NextRequest) {
    const { session, response } = await validateApiAuth(request)
    if (response) return response

    try {
      const body = await request.json()
      const validated = createProductSchema.parse(body)
      const product = await this.service.createProduct(validated)
      return createSuccessResponse(product, HTTP_STATUS.CREATED)
    } catch (error) {
      if (error instanceof ZodError) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid product data',
          error.issues,
          HTTP_STATUS.BAD_REQUEST,
        )
      }
      return handleApiError(error)
    }
  }

  async updateProduct(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const { session, response } = await validateApiAuth(request)
    if (response) return response

    try {
      const { id } = await params
      const validatedId = productIdSchema.parse(id)
      const body = await request.json()
      const validated = updateProductSchema.parse(body)
      const product = await this.service.updateProduct(validatedId, validated)
      return createSuccessResponse(product)
    } catch (error) {
      if (error instanceof ZodError) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid data',
          error.issues,
          HTTP_STATUS.BAD_REQUEST,
        )
      }
      return handleApiError(error)
    }
  }

  async deleteProduct(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const { session, response } = await validateApiAuth(request)
    if (response) return response

    try {
      const { id } = await params
      const validatedId = productIdSchema.parse(id)
      await this.service.deleteProduct(validatedId)
      return createSuccessResponse(null, HTTP_STATUS.NO_CONTENT)
    } catch (error) {
      if (error instanceof ZodError) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid product ID',
          error.issues,
          HTTP_STATUS.BAD_REQUEST,
        )
      }
      return handleApiError(error)
    }
  }
}
```

**Run tests**: `npm run test` → **PASS (GREEN)**

### Step 7: Create Singleton Exports

**File**: `src/server/domains/{domain}/index.ts`

```typescript
import { ProductRepository } from './product.repository'
import { ProductService } from './product.service'
import { ProductController } from './product.controller'

const productRepository = new ProductRepository()
const productService = new ProductService(productRepository)
export const productController = new ProductController(productService)

export * from './product.types'
```

### Step 8: Create API Routes

**File**: `src/app/api/products/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { productController } from '@/server/domains/product'

export async function GET(request: NextRequest) {
  return productController.getProducts(request)
}

export async function POST(request: NextRequest) {
  return productController.createProduct(request)
}
```

**File**: `src/app/api/products/[id]/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { productController } from '@/server/domains/product'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return productController.getProductById(request, context)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return productController.updateProduct(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return productController.deleteProduct(request, context)
}
```

### Step 9: Update Prisma Schema

Remind user to add to `prisma/schema.prisma`:

```prisma
model Product {
  id          String   @id @default(uuid())
  name        String
  description String
  price       Float
  category    String
  inStock     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Then run:

```bash
npx prisma db push
```

### Step 10: Final Test Run

```bash
npm run test
```

All tests should be **GREEN** ✅

## TDD Best Practices Applied

✅ **Write tests before implementation**
✅ **Test one behavior at a time**
✅ **Use descriptive test names** (should do X when Y)
✅ **Test happy path and error cases**
✅ **Mock external dependencies** (database, email, etc.)
✅ **Keep tests independent** (beforeEach clears mocks)
✅ **Verify behavior, not implementation** (check results, not internal calls)
✅ **Use AAA pattern**: Arrange → Act → Assert

## Summary Checklist

After creation, verify:

- [ ] All tests pass (`npm run test`)
- [ ] Test coverage for Repository, Service, Controller
- [ ] Zod validation schemas in place
- [ ] Auth middleware applied to all endpoints
- [ ] Error handling for NOT_FOUND, VALIDATION_ERROR
- [ ] Prisma schema updated and pushed
- [ ] API routes created
- [ ] No comments in code (self-documenting)

Ready to create a TDD domain?
