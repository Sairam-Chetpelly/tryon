# Design Document — Product Catalog with Virtual Try-On

## Overview

This feature adds a fully additive Product Catalog to the existing JewelTry Next.js 15 application. Shoppers can browse jewelry products stored in MongoDB Atlas, view product details, and launch an AI-powered virtual try-on experience directly from any product card or detail page — all without leaving the catalog flow.

The implementation is **entirely additive**: no existing pages, components, or API routes are modified. The only permitted change to existing files is an additive navigation link in `src/components/Header.tsx`.

### Key Design Decisions

- **MongoDB native driver** (`mongodb` npm package) is used instead of Mongoose to keep the dependency footprint small and stay consistent with the existing codebase style (no ORM elsewhere).
- **Connection pooling** is implemented via a module-level cached client following the official Next.js + MongoDB pattern, preventing connection exhaustion under serverless cold-starts.
- **S3 uploads** use the AWS SDK v3 (`@aws-sdk/client-s3`) for tree-shaking and modern credential handling.
- **New catalog components** live under `src/components/catalog/` to avoid polluting the existing flat `src/components/` directory.
- **`EnhancedResultDisplay`** is a new component that does not touch the existing `ResultDisplay.tsx`; it reuses `react-compare-slider` already in the dependency tree.
- **Header navigation** uses `usePathname()` from `next/navigation` to detect the active route client-side, keeping the existing `onHistoryOpen` prop contract intact.

---

## Architecture

```mermaid
graph TD
    subgraph Browser
        A[/products page] -->|fetch| B[ProductGrid]
        B --> C[ProductCard]
        C -->|click Try On| D[TryOnModal]
        D -->|submit| E[/api/tryon]
        D --> F[EnhancedResultDisplay]
        G[/products/id page] --> D
        H[/products/admin page] -->|CRUD| I[Products API]
    end

    subgraph Next.js API Routes
        I[/api/products] --> J[(MongoDB Atlas)]
        K[/api/products/id] --> J
        L[/api/products/upload] --> M[(AWS S3)]
        E[/api/tryon] --> N[AI Provider]
    end

    subgraph Shared Libs
        O[src/lib/mongodb.ts] --> J
        P[src/lib/s3-uploader.ts] --> M
    end

    I --> O
    K --> O
    L --> P
```

### Request Flow — Product Catalog Page

1. Browser loads `/products` → Next.js renders `src/app/products/page.tsx` (Server Component shell + Client Component for interactivity).
2. Client fetches `GET /api/products` (optionally with `?category=` filter).
3. API handler calls `getDb()` from `src/lib/mongodb.ts`, queries the `products` collection, returns JSON array.
4. `ProductGrid` renders `ProductCard` components; skeleton shown during fetch.

### Request Flow — Try-On Modal

1. User clicks "Try On" on a `ProductCard` or detail page.
2. `TryOnModal` opens, pre-populating the jewelry image slot with the product's `imageUrl` and `category`.
3. User uploads their photo via `ImageDropzone`.
4. On submit, modal calls `POST /api/tryon` (existing route, unchanged).
5. On success, `EnhancedResultDisplay` renders with Result / Compare / Split tabs.

### Request Flow — Admin Panel

1. Admin visits `/products/admin`.
2. Page fetches `GET /api/products` to list existing products.
3. Image upload: `POST /api/products/upload` → S3 → returns URL.
4. Product create: `POST /api/products` with the S3 URL.
5. Delete / toggle stock: `DELETE` / `PATCH /api/products/[id]`.

---

## Components and Interfaces

### File Structure — New Files

```
src/
├── app/
│   ├── products/
│   │   ├── page.tsx                          # Catalog page (Server + Client)
│   │   ├── [id]/
│   │   │   └── page.tsx                      # Product detail page
│   │   └── admin/
│   │       └── page.tsx                      # Admin panel (client-side)
│   └── api/
│       └── products/
│           ├── route.ts                      # GET list, POST create
│           ├── [id]/
│           │   └── route.ts                  # GET one, PATCH, DELETE
│           └── upload/
│               └── route.ts                  # POST image to S3
├── components/
│   └── catalog/
│       ├── ProductCard.tsx
│       ├── ProductGrid.tsx
│       ├── CategoryFilterBar.tsx
│       ├── TryOnModal.tsx
│       ├── EnhancedResultDisplay.tsx
│       └── ProductSkeleton.tsx
├── lib/
│   ├── mongodb.ts                            # MongoDB client with connection pooling
│   └── s3-uploader.ts                        # S3 upload utility
└── types/
    └── catalog.ts                            # New Product types (additive)
```

### Existing Files — Additive Changes Only

| File | Change |
|---|---|
| `src/components/Header.tsx` | Add "Products" nav link using `usePathname()`; existing props unchanged |
| `src/types/index.ts` | No changes; new types go in `src/types/catalog.ts` |

### Component Interfaces

#### `ProductCard`

```typescript
interface ProductCardProps {
  product: Product;
  onTryOn: (product: Product) => void;
}
```

Renders product image (with fallback icon on error), name (links to `/products/[id]`), formatted price, category badge, and "Try On" button. Shows "Out of Stock" badge when `inStock` is `false`.

#### `ProductGrid`

```typescript
interface ProductGridProps {
  products: Product[];
  onTryOn: (product: Product) => void;
}
```

Renders a responsive CSS grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. Delegates individual cards to `ProductCard`.

#### `CategoryFilterBar`

```typescript
interface CategoryFilterBarProps {
  selected: JewelryCategory | "all";
  onChange: (category: JewelryCategory | "all") => void;
}
```

Renders an "All" pill plus one pill per `JewelryCategory` value from `JEWELRY_CATEGORIES` constant. Active pill uses `bg-jewelry-primary text-white`.

#### `TryOnModal`

```typescript
interface TryOnModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}
```

Full-screen overlay (`fixed inset-0 z-50`). Manages its own try-on state (user image, status, result). Pre-populates jewelry image from `product.imageUrl` and category from `product.category`. Calls `POST /api/tryon`. Renders `EnhancedResultDisplay` on success. Closes on × button click or Escape key. Applies `overflow-hidden` to `document.body` while open.

#### `EnhancedResultDisplay`

```typescript
interface EnhancedResultDisplayProps {
  resultImageUrl: string;
  userImagePreview: string | null;
  productImageUrl: string;
  onTryAnother: () => void;
}
```

Three tabs: "Result", "Compare", "Split". "Compare" and "Split" are disabled (not hidden) when `userImagePreview` is null. Uses `ReactCompareSlider` from `react-compare-slider` for the Compare tab. Provides Download and "Try Another" buttons.

#### `ProductSkeleton`

No props. Renders a single animated skeleton card matching `ProductCard` dimensions. Used in `ProductGrid` during loading (renders 6 skeletons by default).

---

## Data Models

### `Product` TypeScript Interface (`src/types/catalog.ts`)

```typescript
import type { JewelryCategory } from "@/types";

/**
 * Product as returned by the API (MongoDB _id serialized to string).
 */
export interface Product {
  _id: string;           // MongoDB ObjectId serialized to string
  name: string;          // Required
  description: string;   // Optional, defaults to ""
  price: number;         // Required, >= 0
  category: JewelryCategory; // Required
  imageUrl: string;      // Required — S3 public URL
  thumbnailUrl?: string; // Optional — smaller S3 URL
  inStock: boolean;      // Default: true
  createdAt: string;     // ISO 8601 string (serialized from Date)
  updatedAt: string;     // ISO 8601 string (serialized from Date)
}

/**
 * Shape used when creating a new product (no _id, no timestamps).
 */
export interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  category: JewelryCategory;
  imageUrl: string;
  thumbnailUrl?: string;
  inStock?: boolean;
}

/**
 * Shape used when updating a product (all fields optional).
 */
export type UpdateProductInput = Partial<Omit<CreateProductInput, "imageUrl">> & {
  imageUrl?: string;
};

/**
 * MongoDB document shape (stored in the products collection).
 * _id is ObjectId; timestamps are native Date objects.
 */
export interface ProductDocument {
  _id?: import("mongodb").ObjectId;
  name: string;
  description: string;
  price: number;
  category: JewelryCategory;
  imageUrl: string;
  thumbnailUrl?: string;
  inStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### MongoDB Collection

- **Database**: `jewelry-catalog`
- **Collection**: `products`
- **Indexes**:
  - `{ category: 1 }` — supports category filter queries
  - `{ createdAt: -1 }` — supports default sort
  - `{ inStock: 1 }` — supports stock filter queries

### Serialization

MongoDB `ObjectId` and `Date` fields are not JSON-serializable by default. The API layer serializes them before returning:

```typescript
function serializeProduct(doc: ProductDocument): Product {
  return {
    ...doc,
    _id: doc._id!.toString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
```

---

## Infrastructure Modules

### `src/lib/mongodb.ts` — Connection Pooling

Follows the official Next.js + MongoDB connection caching pattern. A module-level variable holds the cached `MongoClient` promise so that hot-reloads in development and concurrent serverless invocations in production reuse the same connection pool.

```typescript
import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = "jewelry-catalog";

// Module-level cache (survives hot-reload in dev via globalThis)
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(MONGODB_URI);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  const client = new MongoClient(MONGODB_URI);
  clientPromise = client.connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

export default clientPromise;
```

**Environment variable**: `MONGODB_URI=mongodb+srv://youcam:B5wmGFteDPwJlCfa@cluster0.qjgpe8t.mongodb.net/`

### `src/lib/s3-uploader.ts` — S3 Image Upload

Uses `@aws-sdk/client-s3` (AWS SDK v3). Generates a unique key per upload using `uuid` (already in `package.json`).

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const BUCKET = "techiebears-internal";
const REGION = "ap-south-1";
const KEY_PREFIX = "products/";

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface UploadResult {
  url: string;
  key: string;
}

export async function uploadProductImage(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<UploadResult> {
  const ext = originalFilename.split(".").pop() ?? "jpg";
  const key = `${KEY_PREFIX}${uuidv4()}-${originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
  return { url, key };
}
```

**Environment variables** (add to `.env.local`):
```
MONGODB_URI=mongodb+srv://youcam:B5wmGFteDPwJlCfa@cluster0.qjgpe8t.mongodb.net/
AWS_ACCESS_KEY_ID=<from existing .env.local>
AWS_SECRET_ACCESS_KEY=<from existing .env.local>
```

---

## API Routes

### `GET /api/products`

Query params: `category?: JewelryCategory`, `inStock?: "true"`

```
Response 200: Product[]   (sorted by createdAt desc)
Response 500: { success: false, error: string }
```

### `POST /api/products`

Body: `CreateProductInput` (JSON)

```
Response 201: Product
Response 400: { success: false, error: string }   (validation failure)
Response 500: { success: false, error: string }
```

Validation order: `name` → `price` → `category` → `imageUrl`. Price must be `>= 0`. Category must be in `JewelryCategory` union.

### `GET /api/products/[id]`

```
Response 200: Product
Response 400: { success: false, error: "Invalid product ID" }   (malformed ObjectId)
Response 404: { success: false, error: "Product not found" }
Response 500: { success: false, error: string }
```

### `PATCH /api/products/[id]`

Body: `UpdateProductInput` (JSON, partial)

```
Response 200: Product   (updated document with new updatedAt)
Response 400: { success: false, error: "Invalid product ID" }
Response 404: { success: false, error: "Product not found" }
Response 500: { success: false, error: string }
```

### `DELETE /api/products/[id]`

```
Response 200: { success: true }   (always, even if no document matched)
Response 400: { success: false, error: "Invalid product ID" }
Response 500: { success: false, error: string }
```

### `POST /api/products/upload`

Body: `multipart/form-data` with field `image: File`

```
Response 200: { url: string }
Response 400: { success: false, error: string }   (type or size validation)
Response 500: { success: false, error: "Image upload failed" }
```

Validation: MIME type must be `image/jpeg | image/png | image/webp`; size must be `<= 10 MB`.

---

## Header Modification (Additive)

`src/components/Header.tsx` gains a "Products" navigation link. The existing `onHistoryOpen` prop and all existing JSX remain unchanged. The component is converted to use `usePathname()` to detect the active route.

```typescript
// Added import (additive)
import { usePathname } from "next/navigation";
import Link from "next/link";

// Inside the component (additive — inserted before the existing right-actions div)
const pathname = usePathname();
const isProductsActive = pathname.startsWith("/products");

// New JSX added to the right-actions section (before the existing provider badge span)
<Link
  href="/products"
  className={cn(
    "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
    isProductsActive
      ? "bg-jewelry-primary text-white shadow-sm"
      : "text-gray-600 hover:text-jewelry-primary hover:bg-gold-50"
  )}
>
  Products
</Link>
```

The home page (`/`) continues to render identically because the new link is purely additive and the `onHistoryOpen` prop contract is unchanged.

---

## Dependency Additions

| Package | Version | Purpose |
|---|---|---|
| `mongodb` | `^6.10.0` | Native MongoDB driver for Next.js API routes |
| `@aws-sdk/client-s3` | `^3.700.0` | AWS SDK v3 S3 client for image uploads |

Install command:
```bash
npm install mongodb@^6.10.0 @aws-sdk/client-s3@^3.700.0
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

Before listing properties, redundant candidates are eliminated:

- Requirements 1.4, 1.5, 1.6 all test input validation on the create endpoint. They can be unified into one comprehensive validation property.
- Requirements 2.2 and 2.3 both test filter correctness (category filter and inStock filter). They share the same pattern and can be unified.
- Requirements 2.4 and 2.6 both test round-trip correctness (insert → fetch). They can be unified into one round-trip property.
- Requirements 2.7 and 9.7 both test mutation/update correctness. They can be unified.
- Requirements 8.2 and 8.7 both test tab state relative to user photo availability. They can be unified.
- Requirement 10.2 (active link highlighting) is a pure function of pathname — a clean property.

After reflection, the following non-redundant properties remain:

---

### Property 1: MongoDB Connection Reuse

*For any* number of calls N ≥ 2 to `getDb()`, all calls should resolve to the same underlying `MongoClient` instance (i.e., the same object reference), confirming that connection pooling is active and no new connections are opened per call.

**Validates: Requirements 1.2**

---

### Property 2: Product Validation Rejects Invalid Inputs

*For any* product creation request that is missing at least one required field (`name`, `price`, `category`, or `imageUrl`), or that provides a `price` less than 0, or that provides a `category` string not in the `JewelryCategory` union, the `POST /api/products` handler SHALL return HTTP 400 with a non-empty error message string.

**Validates: Requirements 1.4, 1.5, 1.6**

---

### Property 3: Product List Sort Invariant

*For any* collection of products stored in MongoDB with distinct `createdAt` timestamps, `GET /api/products` SHALL return them in descending `createdAt` order — i.e., for every adjacent pair `(products[i], products[i+1])` in the response array, `products[i].createdAt >= products[i+1].createdAt`.

**Validates: Requirements 2.1**

---

### Property 4: Filter Correctness

*For any* valid `category` value or `inStock=true` query parameter, every product in the `GET /api/products` response SHALL satisfy the applied filter condition. No product in the response may have a different category than the requested one, and no out-of-stock product may appear when `inStock=true` is requested.

**Validates: Requirements 2.2, 2.3**

---

### Property 5: Product CRUD Round-Trip

*For any* valid `CreateProductInput`, executing `POST /api/products` followed by `GET /api/products/[id]` (using the `_id` from the POST response) SHALL return a product document whose `name`, `price`, `category`, `imageUrl`, `description`, and `inStock` fields are equal to the values submitted in the creation request.

**Validates: Requirements 2.4, 2.6**

---

### Property 6: PATCH Preserves Unmodified Fields and Advances `updatedAt`

*For any* existing product and any valid `UpdateProductInput` that modifies a subset of fields, the `PATCH /api/products/[id]` response SHALL contain the updated values for patched fields, the original values for unpatched fields, and an `updatedAt` timestamp that is greater than or equal to the product's `updatedAt` before the patch.

**Validates: Requirements 2.7**

---

### Property 7: DELETE Idempotence

*For any* product id (whether it matches an existing product or not, provided the id is a valid ObjectId format), `DELETE /api/products/[id]` SHALL return HTTP 200 with `{ success: true }`.

**Validates: Requirements 2.9**

---

### Property 8: Upload Key Uniqueness

*For any* two calls to the `uploadProductImage` function (or the key-generation logic within it) with the same `originalFilename`, the two generated S3 keys SHALL be different strings.

**Validates: Requirements 3.2**

---

### Property 9: Upload MIME Type Validation

*For any* MIME type string that is not one of `image/jpeg`, `image/png`, or `image/webp`, `POST /api/products/upload` SHALL return HTTP 400 with the message "Only JPEG, PNG, and WebP images are allowed".

**Validates: Requirements 3.4**

---

### Property 10: Category Filter Updates Displayed Products

*For any* category selection in the `CategoryFilterBar`, every `ProductCard` rendered in the `ProductGrid` SHALL have a `category` equal to the selected filter value (or any category when "All" is selected).

**Validates: Requirements 4.7**

---

### Property 11: ProductCard Renders All Required Elements

*For any* `Product` object, the rendered `ProductCard` SHALL contain: an `<img>` element (or fallback icon), the product name, the price formatted as currency, a category badge, and a "Try On" button.

**Validates: Requirements 5.1**

---

### Property 12: TryOnModal Pre-Population

*For any* `Product`, opening `TryOnModal` with that product SHALL result in the jewelry image slot being pre-populated with the product's `imageUrl` and the jewelry category being set to the product's `category`.

**Validates: Requirements 7.2**

---

### Property 13: EnhancedResultDisplay Tab Availability

*For any* result state, the `EnhancedResultDisplay` SHALL always render all three tabs ("Result", "Compare", "Split"). When `userImagePreview` is `null` or `undefined`, the "Compare" and "Split" tabs SHALL be disabled (not hidden). When `userImagePreview` becomes `null` while "Compare" or "Split" is the active tab, the active tab SHALL immediately switch to "Result".

**Validates: Requirements 8.2, 8.7**

---

### Property 14: Admin Panel Renders All Products

*For any* list of products returned by `GET /api/products`, the Admin Panel SHALL render one row per product, and each row SHALL display the product's `name`, `category`, `price`, and `inStock` status.

**Validates: Requirements 9.2**

---

### Property 15: inStock Toggle Round-Trip

*For any* product, toggling `inStock` twice via `PATCH /api/products/[id]` SHALL result in the product's `inStock` value being equal to its original value (i.e., toggle is its own inverse).

**Validates: Requirements 9.7**

---

### Property 16: Products Link Active State

*For any* pathname string, the "Products" link in the `Header` SHALL have its active styling applied if and only if the pathname starts with `/products`. For all other pathnames (including `/`), the link SHALL not have active styling.

**Validates: Requirements 10.2**

---

## Error Handling

### API Layer

All API route handlers follow a consistent error handling pattern:

```typescript
try {
  // ... handler logic
} catch (error) {
  const message = error instanceof Error ? error.message : "Internal server error";
  console.error(`[API /api/products/...] Unhandled error:`, error);
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}
```

Specific error cases:

| Scenario | HTTP Status | Response Body |
|---|---|---|
| Missing required field | 400 | `{ success: false, error: "Field '<name>' is required" }` |
| Price < 0 | 400 | `{ success: false, error: "Price must be a non-negative number" }` |
| Invalid category | 400 | `{ success: false, error: "Invalid jewelry category" }` |
| Malformed ObjectId | 400 | `{ success: false, error: "Invalid product ID" }` |
| Product not found | 404 | `{ success: false, error: "Product not found" }` |
| Invalid MIME type | 400 | `{ success: false, error: "Only JPEG, PNG, and WebP images are allowed" }` |
| File > 10 MB | 400 | `{ success: false, error: "Image must be 10 MB or smaller" }` |
| S3 upload failure | 500 | `{ success: false, error: "Image upload failed" }` |
| Unhandled server error | 500 | `{ success: false, error: "<message>" }` |

### UI Layer

- **Catalog page**: Shows error banner with "Retry" button on fetch failure; does not show empty-state message during error state.
- **Admin panel**: Shows inline error message per failed operation (add, delete, toggle).
- **TryOnModal**: Shows error message within the modal; does not close on error.
- **ProductCard**: Shows fallback jewelry icon (`<Gem />` from lucide-react) on image load error via `onError` handler.

### MongoDB ObjectId Validation

Before any `findOne`, `updateOne`, or `deleteOne` by `_id`, the handler validates the id string using `ObjectId.isValid(id)`. If invalid, it returns 400 immediately without hitting the database.

```typescript
import { ObjectId } from "mongodb";

if (!ObjectId.isValid(id)) {
  return NextResponse.json(
    { success: false, error: "Invalid product ID" },
    { status: 400 }
  );
}
```

---

## Testing Strategy

### Dual Testing Approach

Both unit/example-based tests and property-based tests are used. Unit tests cover specific examples, edge cases, and integration points. Property tests verify universal invariants across many generated inputs.

### Property-Based Testing Library

**[fast-check](https://fast-check.dev/)** is the chosen PBT library for TypeScript/JavaScript. It integrates with Jest/Vitest, supports complex arbitraries (objects, arrays, strings with constraints), and runs 100 iterations by default.

Install:
```bash
npm install --save-dev fast-check
```

Each property test is tagged with a comment referencing the design property:
```typescript
// Feature: product-catalog-tryon, Property 3: Product list sort invariant
```

Minimum 100 iterations per property test (fast-check default).

### Unit / Example Tests

Focus areas:
- `src/lib/mongodb.ts`: connection pooling (Property 1)
- `src/lib/s3-uploader.ts`: key generation uniqueness (Property 8)
- API route handlers: validation logic, error responses, serialization
- `ProductCard`: rendering with various product shapes
- `EnhancedResultDisplay`: tab state machine
- `CategoryFilterBar`: filter selection
- `Header`: active link detection

### Property Tests

| Property | Test File | Arbitraries |
|---|---|---|
| P1: Connection reuse | `__tests__/lib/mongodb.test.ts` | N calls (integer 2–20) |
| P2: Validation rejects invalid inputs | `__tests__/api/products.test.ts` | Products with missing/invalid fields |
| P3: Sort invariant | `__tests__/api/products.test.ts` | Arrays of products with random createdAt |
| P4: Filter correctness | `__tests__/api/products.test.ts` | Product arrays + random category filter |
| P5: CRUD round-trip | `__tests__/api/products.test.ts` | Valid CreateProductInput objects |
| P6: PATCH preserves fields | `__tests__/api/products.test.ts` | Products + partial update objects |
| P7: DELETE idempotence | `__tests__/api/products.test.ts` | Valid ObjectId strings |
| P8: Upload key uniqueness | `__tests__/lib/s3-uploader.test.ts` | Filename strings |
| P9: MIME type validation | `__tests__/api/upload.test.ts` | Arbitrary MIME type strings |
| P10: Category filter UI | `__tests__/components/ProductGrid.test.tsx` | Product arrays + category selections |
| P11: ProductCard elements | `__tests__/components/ProductCard.test.tsx` | Product objects |
| P12: Modal pre-population | `__tests__/components/TryOnModal.test.tsx` | Product objects |
| P13: Tab availability | `__tests__/components/EnhancedResultDisplay.test.tsx` | Result states with/without user photo |
| P14: Admin panel rows | `__tests__/components/AdminPanel.test.tsx` | Product arrays |
| P15: inStock toggle | `__tests__/api/products.test.ts` | Product objects |
| P16: Active link state | `__tests__/components/Header.test.tsx` | Pathname strings |

### Integration Tests

- `POST /api/products/upload` → real or mocked S3 client, verify key prefix and URL format (Requirements 3.1, 3.3)
- MongoDB connection smoke test: `getDb()` ping (Requirement 1.1)

### Test Configuration

```typescript
// Example property test structure
import fc from "fast-check";

// Feature: product-catalog-tryon, Property 3: Product list sort invariant
test("GET /api/products returns products sorted by createdAt descending", () => {
  fc.assert(
    fc.property(
      fc.array(productArbitrary(), { minLength: 2, maxLength: 20 }),
      (products) => {
        const sorted = sortByCreatedAtDesc(products);
        for (let i = 0; i < sorted.length - 1; i++) {
          expect(new Date(sorted[i].createdAt).getTime())
            .toBeGreaterThanOrEqual(new Date(sorted[i + 1].createdAt).getTime());
        }
      }
    ),
    { numRuns: 100 }
  );
});
```
