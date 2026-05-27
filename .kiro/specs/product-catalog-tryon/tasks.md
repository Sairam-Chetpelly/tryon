# Implementation Plan: Product Catalog with Virtual Try-On

## Overview

Incrementally build the product catalog feature on top of the existing JewelTry Next.js 15 app. The plan starts with infrastructure (types, DB, S3), moves through API routes, then UI components, and finishes by wiring everything together into the catalog, detail, and admin pages. All changes are additive; the only modification to an existing file is adding a nav link to `Header.tsx`.

## Tasks

- [x] 1. Install dependencies and configure environment
  - Run `npm install mongodb@^6.10.0 @aws-sdk/client-s3@^3.700.0`
  - Run `npm install --save-dev fast-check` for property-based tests
  - Add `MONGODB_URI=mongodb+srv://youcam:B5wmGFteDPwJlCfa@cluster0.qjgpe8t.mongodb.net/` to `.env.local`
  - _Requirements: 1.1_

- [x] 2. Define TypeScript types
  - [x] 2.1 Create `src/types/catalog.ts` with `Product`, `CreateProductInput`, `UpdateProductInput`, and `ProductDocument` interfaces
    - Import `JewelryCategory` from `@/types`
    - `Product._id` is a serialized string; `ProductDocument._id` is `ObjectId`
    - `createdAt`/`updatedAt` are `string` (ISO 8601) on `Product` and `Date` on `ProductDocument`
    - _Requirements: 1.3_

- [x] 3. Implement infrastructure libraries
  - [x] 3.1 Create `src/lib/mongodb.ts` with connection pooling
    - Use module-level `globalThis._mongoClientPromise` cache in development to survive hot-reloads
    - Export `getDb(): Promise<Db>` returning the `jewelry-catalog` database
    - Export `clientPromise` as default
    - _Requirements: 1.1, 1.2_

  - [ ]* 3.2 Write property test for MongoDB connection reuse (Property 1)
    - **Property 1: MongoDB Connection Reuse**
    - **Validates: Requirements 1.2**
    - File: `__tests__/lib/mongodb.test.ts`
    - Assert that N ≥ 2 calls to `getDb()` all resolve to the same `MongoClient` instance

  - [x] 3.3 Create `src/lib/s3-uploader.ts` with `uploadProductImage` function
    - Use `@aws-sdk/client-s3` `S3Client` + `PutObjectCommand`
    - Generate key as `products/<uuid>-<sanitized-filename>`; bucket `techiebears-internal`, region `ap-south-1`
    - Return `{ url, key }` where `url` is the public S3 URL
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 3.4 Write property test for upload key uniqueness (Property 8)
    - **Property 8: Upload Key Uniqueness**
    - **Validates: Requirements 3.2**
    - File: `__tests__/lib/s3-uploader.test.ts`
    - Assert that two calls with the same `originalFilename` produce different keys

- [x] 4. Implement Products CRUD API routes
  - [x] 4.1 Create `src/app/api/products/route.ts` (GET list + POST create)
    - GET: query `products` collection sorted by `createdAt` desc; support `?category=` and `?inStock=true` filters; serialize with `serializeProduct`
    - POST: validate `name`, `price` (≥ 0), `category` (in `JewelryCategory`), `imageUrl`; insert document with `createdAt`/`updatedAt`; return 201
    - Wrap both handlers in try/catch returning `{ success: false, error }` on 500
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.6, 2.10_

  - [ ]* 4.2 Write property tests for product validation and list sort (Properties 2, 3, 4)
    - **Property 2: Product Validation Rejects Invalid Inputs**
    - **Property 3: Product List Sort Invariant**
    - **Property 4: Filter Correctness**
    - **Validates: Requirements 1.4, 1.5, 1.6, 2.1, 2.2, 2.3**
    - File: `__tests__/api/products.test.ts`

  - [x] 4.3 Create `src/app/api/products/[id]/route.ts` (GET one + PATCH + DELETE)
    - Validate ObjectId with `ObjectId.isValid(id)` before any DB call; return 400 on invalid
    - GET: return 404 if not found
    - PATCH: `findOneAndUpdate` with `$set` + `updatedAt: new Date()`; return updated document
    - DELETE: `deleteOne`; always return `{ success: true }` on 200
    - _Requirements: 2.4, 2.5, 2.7, 2.8, 2.9, 2.10_

  - [ ]* 4.4 Write property tests for CRUD round-trip, PATCH, and DELETE (Properties 5, 6, 7, 15)
    - **Property 5: Product CRUD Round-Trip**
    - **Property 6: PATCH Preserves Unmodified Fields and Advances `updatedAt`**
    - **Property 7: DELETE Idempotence**
    - **Property 15: inStock Toggle Round-Trip**
    - **Validates: Requirements 2.4, 2.6, 2.7, 2.9, 9.7**
    - File: `__tests__/api/products.test.ts`

  - [x] 4.5 Create `src/app/api/products/upload/route.ts` (POST image to S3)
    - Parse `multipart/form-data`; validate MIME type (`image/jpeg | image/png | image/webp`) and size (≤ 10 MB)
    - Call `uploadProductImage` from `src/lib/s3-uploader.ts`; return `{ url }` on success
    - Return 400 for invalid MIME or oversized file; 500 on S3 failure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 4.6 Write property test for MIME type validation (Property 9)
    - **Property 9: Upload MIME Type Validation**
    - **Validates: Requirements 3.4**
    - File: `__tests__/api/upload.test.ts`
    - Assert that any MIME type outside the allowed set returns HTTP 400

- [x] 5. Checkpoint — Ensure all API tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement catalog UI components
  - [x] 6.1 Create `src/components/catalog/ProductSkeleton.tsx`
    - Animated skeleton card matching `ProductCard` dimensions (image area, name line, price line, button)
    - No props; used as a loading placeholder
    - _Requirements: 4.3_

  - [x] 6.2 Create `src/components/catalog/CategoryFilterBar.tsx`
    - Render "All" pill + one pill per `JewelryCategory` from `JEWELRY_CATEGORIES` constant
    - Active pill: `bg-jewelry-primary text-white`; inactive: hover styles
    - Props: `selected: JewelryCategory | "all"`, `onChange`
    - _Requirements: 4.6, 4.7_

  - [ ]* 6.3 Write unit tests for `CategoryFilterBar`
    - Test that clicking a category pill calls `onChange` with the correct value
    - _Requirements: 4.6, 4.7_

  - [x] 6.4 Create `src/components/catalog/ProductCard.tsx`
    - Display product image (with `<Gem />` fallback on `onError`), name (link to `/products/[id]`), price (formatted as currency), category badge, "Try On" button
    - Show "Out of Stock" badge when `inStock` is `false`; disable "Try On" button but still open modal on click
    - Props: `product: Product`, `onTryOn: (product: Product) => void`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 6.5 Write property test for `ProductCard` rendering (Property 11)
    - **Property 11: ProductCard Renders All Required Elements**
    - **Validates: Requirements 5.1**
    - File: `__tests__/components/ProductCard.test.tsx`

  - [x] 6.6 Create `src/components/catalog/ProductGrid.tsx`
    - Responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
    - Render 6 `ProductSkeleton` components while loading; delegate to `ProductCard` when data is available
    - Props: `products: Product[]`, `onTryOn: (product: Product) => void`
    - _Requirements: 4.2, 4.3_

  - [ ]* 6.7 Write property test for category filter UI (Property 10)
    - **Property 10: Category Filter Updates Displayed Products**
    - **Validates: Requirements 4.7**
    - File: `__tests__/components/ProductGrid.test.tsx`

- [x] 7. Implement EnhancedResultDisplay and TryOnModal
  - [x] 7.1 Create `src/components/catalog/EnhancedResultDisplay.tsx`
    - Three tabs: "Result", "Compare", "Split"
    - "Compare" and "Split" disabled (not hidden) when `userImagePreview` is null; switch active tab to "Result" if it becomes null while Compare/Split is active
    - "Compare" tab: `ReactCompareSlider` from `react-compare-slider`
    - "Split" tab: side-by-side with "Before" / "After" labels
    - "Download" button saves result image; "Try Another" button resets to upload state
    - Props: `resultImageUrl`, `userImagePreview`, `productImageUrl`, `onTryAnother`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 7.2 Write property test for tab availability (Property 13)
    - **Property 13: EnhancedResultDisplay Tab Availability**
    - **Validates: Requirements 8.2, 8.7**
    - File: `__tests__/components/EnhancedResultDisplay.test.tsx`

  - [x] 7.3 Create `src/components/catalog/TryOnModal.tsx`
    - Full-screen overlay (`fixed inset-0 z-50`) with × close button
    - Pre-populate jewelry image slot with `product.imageUrl` and category with `product.category`
    - Accept user photo via `ImageDropzone`; call `POST /api/tryon` on submit
    - Render `EnhancedResultDisplay` on success; show inline error on failure
    - Close on × click or Escape key; apply `overflow-hidden` to `document.body` while open
    - Props: `product: Product`, `isOpen: boolean`, `onClose: () => void`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ]* 7.4 Write property test for TryOnModal pre-population (Property 12)
    - **Property 12: TryOnModal Pre-Population**
    - **Validates: Requirements 7.2**
    - File: `__tests__/components/TryOnModal.test.tsx`

- [x] 8. Checkpoint — Ensure all component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement catalog and detail pages
  - [x] 9.1 Create `src/app/products/page.tsx` (catalog page)
    - Server Component shell; Client Component for interactivity (filter state, fetch, modal state)
    - Fetch `GET /api/products` on mount; show `ProductSkeleton` during load
    - Show error banner with "Retry" button on failure (no empty-state during error)
    - Show "No products available yet." when response is empty
    - Render `CategoryFilterBar` + `ProductGrid`; open `TryOnModal` on card "Try On" click
    - Use existing gold/jewelry Tailwind theme
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 9.2 Create `src/app/products/[id]/page.tsx` (product detail page)
    - Fetch `GET /api/products/[id]`; render full image, name, price, category, description, stock status
    - Show "Product not found" with link back to `/products` on 404 or malformed id
    - Breadcrumb: "Home → Products → [Product Name]"
    - "Try On" button opens `TryOnModal` pre-loaded with the product
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 10. Implement admin panel
  - [x] 10.1 Create `src/app/products/admin/page.tsx` (admin panel, client-side)
    - Fetch and display all products (name, category, price, inStock) on load
    - "Add Product" form: name, description, price, category dropdown, image upload
    - On image select: POST to `/api/products/upload`, show preview
    - On form submit: POST to `/api/products`, add to list on success
    - "Delete" button per row: DELETE `/api/products/[id]`, remove from list on success
    - inStock toggle per row: PATCH `/api/products/[id]`, update list on success
    - Show inline error message on any API failure
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [ ]* 10.2 Write property test for admin panel product rows (Property 14)
    - **Property 14: Admin Panel Renders All Products**
    - **Validates: Requirements 9.2**
    - File: `__tests__/components/AdminPanel.test.tsx`

- [x] 11. Add Products navigation link to Header
  - [x] 11.1 Modify `src/components/Header.tsx` (additive only)
    - Add `"use client"` directive if not already present
    - Import `usePathname` from `next/navigation` and `Link` from `next/link`
    - Derive `isProductsActive = pathname.startsWith("/products")`
    - Insert `<Link href="/products">` with active/inactive Tailwind classes before the existing right-actions content
    - Leave all existing props, JSX, and behavior unchanged
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ]* 11.2 Write property test for active link state (Property 16)
    - **Property 16: Products Link Active State**
    - **Validates: Requirements 10.2**
    - File: `__tests__/components/Header.test.tsx`
    - Assert active styling iff pathname starts with `/products`

- [x] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical boundaries
- Property tests validate universal correctness properties using `fast-check`
- Unit tests validate specific examples and edge cases
- The Header change (task 11.1) is the only modification to an existing file; all other tasks create new files

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["3.1", "3.3"] },
    { "id": 2, "tasks": ["3.2", "3.4", "4.1", "4.3", "4.5"] },
    { "id": 3, "tasks": ["4.2", "4.4", "4.6", "6.1", "6.2", "6.4"] },
    { "id": 4, "tasks": ["6.3", "6.5", "6.6"] },
    { "id": 5, "tasks": ["6.7", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3"] },
    { "id": 7, "tasks": ["7.4", "9.1", "9.2", "10.1"] },
    { "id": 8, "tasks": ["10.2", "11.1"] },
    { "id": 9, "tasks": ["11.2"] }
  ]
}
```
