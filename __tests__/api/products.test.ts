/**
 * Tests for Products API validation logic and data serialization.
 *
 * These tests cover:
 * - serializeProduct (catalog.ts)
 * - Product validation logic (extracted from route.ts)
 * - Sort invariant (Property 3)
 * - Filter correctness (Property 4)
 * - Validation rejects invalid inputs (Property 2)
 *
 * Validates: Requirements 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3
 */

import fc from "fast-check";
import { ObjectId } from "mongodb";
import { serializeProduct, type ProductDocument } from "@/types/catalog";
import type { JewelryCategory } from "@/types";
import { JEWELRY_CATEGORIES } from "@/lib/constants";

// ---- Helpers ----

const VALID_CATEGORIES = JEWELRY_CATEGORIES.map((c) => c.value) as JewelryCategory[];

/**
 * Extracted validation logic matching the POST /api/products handler.
 * Returns an error string if invalid, or null if valid.
 */
function validateProductInput(body: Record<string, unknown>): string | null {
  if (!body.name || typeof body.name !== "string" || (body.name as string).trim() === "") {
    return "Field 'name' is required";
  }
  if (body.price === undefined || body.price === null) {
    return "Field 'price' is required";
  }
  if (typeof body.price !== "number" || (body.price as number) < 0) {
    return "Price must be a non-negative number";
  }
  if (!body.category || typeof body.category !== "string") {
    return "Field 'category' is required";
  }
  if (!VALID_CATEGORIES.includes(body.category as JewelryCategory)) {
    return "Invalid jewelry category";
  }
  if (!body.imageUrl || typeof body.imageUrl !== "string" || (body.imageUrl as string).trim() === "") {
    return "Field 'imageUrl' is required";
  }
  return null;
}

/**
 * Sorts products by createdAt descending (mirrors the MongoDB sort in the API).
 */
function sortByCreatedAtDesc(products: Array<{ createdAt: string }>): Array<{ createdAt: string }> {
  return [...products].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ---- Arbitraries ----

const validCategoryArb = fc.constantFrom(...VALID_CATEGORIES);

const validProductInputArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  price: fc.integer({ min: 0, max: 100000 }),
  category: validCategoryArb,
  imageUrl: fc.webUrl(),
  description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  inStock: fc.option(fc.boolean(), { nil: undefined }),
});

const productDocArb = fc.record({
  _id: fc.constant(new ObjectId()),
  name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  description: fc.string({ maxLength: 500 }),
  price: fc.integer({ min: 0, max: 100000 }),
  category: validCategoryArb,
  imageUrl: fc.webUrl(),
  inStock: fc.boolean(),
  createdAt: fc.date({ min: new Date("2020-01-01"), max: new Date("2030-01-01"), noInvalidDate: true }),
  updatedAt: fc.date({ min: new Date("2020-01-01"), max: new Date("2030-01-01"), noInvalidDate: true }),
});

// ---- serializeProduct tests ----

describe("serializeProduct", () => {
  test("converts ObjectId _id to string", () => {
    const id = new ObjectId();
    const doc: ProductDocument = {
      _id: id,
      name: "Gold Ring",
      description: "A beautiful ring",
      price: 99.99,
      category: "ring",
      imageUrl: "https://example.com/ring.jpg",
      inStock: true,
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
    };
    const product = serializeProduct(doc);
    expect(product._id).toBe(id.toString());
    expect(typeof product._id).toBe("string");
  });

  test("converts Date fields to ISO 8601 strings", () => {
    const createdAt = new Date("2024-06-15T12:00:00Z");
    const updatedAt = new Date("2024-06-16T08:30:00Z");
    const doc: ProductDocument = {
      _id: new ObjectId(),
      name: "Necklace",
      description: "",
      price: 50,
      category: "necklace",
      imageUrl: "https://example.com/necklace.jpg",
      inStock: true,
      createdAt,
      updatedAt,
    };
    const product = serializeProduct(doc);
    expect(product.createdAt).toBe(createdAt.toISOString());
    expect(product.updatedAt).toBe(updatedAt.toISOString());
  });

  test("preserves all other fields", () => {
    const doc: ProductDocument = {
      _id: new ObjectId(),
      name: "Bracelet",
      description: "Silver bracelet",
      price: 75.5,
      category: "bracelet",
      imageUrl: "https://example.com/bracelet.jpg",
      thumbnailUrl: "https://example.com/bracelet-thumb.jpg",
      inStock: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const product = serializeProduct(doc);
    expect(product.name).toBe(doc.name);
    expect(product.description).toBe(doc.description);
    expect(product.price).toBe(doc.price);
    expect(product.category).toBe(doc.category);
    expect(product.imageUrl).toBe(doc.imageUrl);
    expect(product.thumbnailUrl).toBe(doc.thumbnailUrl);
    expect(product.inStock).toBe(doc.inStock);
  });

  // Property: serializeProduct always produces string _id and ISO string dates
  test("Property: serializeProduct always produces string _id and ISO string dates", () => {
    fc.assert(
      fc.property(productDocArb, (doc) => {
        const product = serializeProduct(doc);
        return (
          typeof product._id === "string" &&
          typeof product.createdAt === "string" &&
          typeof product.updatedAt === "string" &&
          !isNaN(new Date(product.createdAt).getTime()) &&
          !isNaN(new Date(product.updatedAt).getTime())
        );
      }),
      { numRuns: 100 }
    );
  });
});

// ---- Validation logic tests ----

describe("Product input validation", () => {
  test("accepts a valid product input", () => {
    const result = validateProductInput({
      name: "Gold Necklace",
      price: 199.99,
      category: "necklace",
      imageUrl: "https://example.com/necklace.jpg",
    });
    expect(result).toBeNull();
  });

  test("rejects missing name", () => {
    const result = validateProductInput({
      price: 100,
      category: "ring",
      imageUrl: "https://example.com/ring.jpg",
    });
    expect(result).toBe("Field 'name' is required");
  });

  test("rejects empty name string", () => {
    const result = validateProductInput({
      name: "   ",
      price: 100,
      category: "ring",
      imageUrl: "https://example.com/ring.jpg",
    });
    expect(result).toBe("Field 'name' is required");
  });

  test("rejects missing price", () => {
    const result = validateProductInput({
      name: "Ring",
      category: "ring",
      imageUrl: "https://example.com/ring.jpg",
    });
    expect(result).toBe("Field 'price' is required");
  });

  test("rejects negative price", () => {
    const result = validateProductInput({
      name: "Ring",
      price: -1,
      category: "ring",
      imageUrl: "https://example.com/ring.jpg",
    });
    expect(result).toBe("Price must be a non-negative number");
  });

  test("rejects price of non-number type", () => {
    const result = validateProductInput({
      name: "Ring",
      price: "free",
      category: "ring",
      imageUrl: "https://example.com/ring.jpg",
    });
    expect(result).toBe("Price must be a non-negative number");
  });

  test("accepts price of 0", () => {
    const result = validateProductInput({
      name: "Ring",
      price: 0,
      category: "ring",
      imageUrl: "https://example.com/ring.jpg",
    });
    expect(result).toBeNull();
  });

  test("rejects missing category", () => {
    const result = validateProductInput({
      name: "Ring",
      price: 100,
      imageUrl: "https://example.com/ring.jpg",
    });
    expect(result).toBe("Field 'category' is required");
  });

  test("rejects invalid category", () => {
    const result = validateProductInput({
      name: "Ring",
      price: 100,
      category: "hat",
      imageUrl: "https://example.com/ring.jpg",
    });
    expect(result).toBe("Invalid jewelry category");
  });

  test("rejects missing imageUrl", () => {
    const result = validateProductInput({
      name: "Ring",
      price: 100,
      category: "ring",
    });
    expect(result).toBe("Field 'imageUrl' is required");
  });

  test("rejects empty imageUrl", () => {
    const result = validateProductInput({
      name: "Ring",
      price: 100,
      category: "ring",
      imageUrl: "   ",
    });
    expect(result).toBe("Field 'imageUrl' is required");
  });

  test("accepts all valid JewelryCategory values", () => {
    for (const category of VALID_CATEGORIES) {
      const result = validateProductInput({
        name: "Item",
        price: 10,
        category,
        imageUrl: "https://example.com/item.jpg",
      });
      expect(result).toBeNull();
    }
  });

  // ---- Property 2: Product Validation Rejects Invalid Inputs ----
  // Feature: product-catalog-tryon, Property 2: Product Validation Rejects Invalid Inputs

  test("Property 2: missing required field always returns 400-level error", () => {
    // Test with missing name
    fc.assert(
      fc.property(
        fc.record({
          price: fc.float({ min: 0, max: 100000, noNaN: true }),
          category: validCategoryArb,
          imageUrl: fc.webUrl(),
        }),
        (body) => {
          const result = validateProductInput(body as Record<string, unknown>);
          return result !== null && result.length > 0;
        }
      ),
      { numRuns: 50 }
    );
  });

  test("Property 2: negative price always returns error", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100000, max: -1 }),
        (price) => {
          const result = validateProductInput({
            name: "Item",
            price,
            category: "ring",
            imageUrl: "https://example.com/item.jpg",
          });
          return result === "Price must be a non-negative number";
        }
      ),
      { numRuns: 100 }
    );
  });

  test("Property 2: invalid category always returns error", () => {
    const invalidCategoryArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => !VALID_CATEGORIES.includes(s as JewelryCategory));

    fc.assert(
      fc.property(invalidCategoryArb, (category) => {
        const result = validateProductInput({
          name: "Item",
          price: 10,
          category,
          imageUrl: "https://example.com/item.jpg",
        });
        return result === "Invalid jewelry category";
      }),
      { numRuns: 100 }
    );
  });

  test("Property 2: valid inputs always pass validation", () => {
    fc.assert(
      fc.property(validProductInputArb, (input) => {
        const result = validateProductInput(input as Record<string, unknown>);
        return result === null;
      }),
      { numRuns: 100 }
    );
  });
});

// ---- Sort invariant tests ----

describe("Product list sort invariant", () => {
  // ---- Property 3: Product List Sort Invariant ----
  // Feature: product-catalog-tryon, Property 3: Product List Sort Invariant

  test("Property 3: sortByCreatedAtDesc returns products in descending createdAt order", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            createdAt: fc
              .date({ min: new Date("2020-01-01"), max: new Date("2030-01-01"), noInvalidDate: true })
              .map((d) => d.toISOString()),
          }),
          { minLength: 2, maxLength: 20 }
        ),
        (products) => {
          const sorted = sortByCreatedAtDesc(products);
          for (let i = 0; i < sorted.length - 1; i++) {
            const a = new Date(sorted[i].createdAt).getTime();
            const b = new Date(sorted[i + 1].createdAt).getTime();
            if (a < b) return false;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test("sortByCreatedAtDesc does not mutate the original array", () => {
    const products = [
      { createdAt: "2024-01-01T00:00:00Z" },
      { createdAt: "2024-03-01T00:00:00Z" },
      { createdAt: "2024-02-01T00:00:00Z" },
    ];
    const original = [...products];
    sortByCreatedAtDesc(products);
    expect(products).toEqual(original);
  });
});

// ---- Filter correctness tests ----

describe("Product filter correctness", () => {
  /**
   * Simulates the category filter applied in GET /api/products.
   */
  function filterByCategory(
    products: Array<{ category: JewelryCategory }>,
    category: JewelryCategory
  ) {
    return products.filter((p) => p.category === category);
  }

  /**
   * Simulates the inStock filter applied in GET /api/products.
   */
  function filterByInStock(products: Array<{ inStock: boolean }>) {
    return products.filter((p) => p.inStock === true);
  }

  // ---- Property 4: Filter Correctness ----
  // Feature: product-catalog-tryon, Property 4: Filter Correctness

  test("Property 4: category filter returns only products with matching category", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            category: validCategoryArb,
            inStock: fc.boolean(),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        validCategoryArb,
        (products, selectedCategory) => {
          const filtered = filterByCategory(products, selectedCategory);
          return filtered.every((p) => p.category === selectedCategory);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("Property 4: inStock filter returns only in-stock products", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            category: validCategoryArb,
            inStock: fc.boolean(),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (products) => {
          const filtered = filterByInStock(products);
          return filtered.every((p) => p.inStock === true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("category filter with no matching products returns empty array", () => {
    const products = [
      { category: "ring" as JewelryCategory, inStock: true },
      { category: "ring" as JewelryCategory, inStock: false },
    ];
    const filtered = filterByCategory(products, "necklace");
    expect(filtered).toHaveLength(0);
  });

  test("inStock filter with all out-of-stock products returns empty array", () => {
    const products = [
      { category: "ring" as JewelryCategory, inStock: false },
      { category: "necklace" as JewelryCategory, inStock: false },
    ];
    const filtered = filterByInStock(products);
    expect(filtered).toHaveLength(0);
  });
});

// ---- ObjectId validation tests ----

describe("ObjectId validation", () => {
  test("valid ObjectId string passes isValid check", () => {
    const id = new ObjectId();
    expect(ObjectId.isValid(id.toString())).toBe(true);
  });

  test("invalid ObjectId string fails isValid check", () => {
    expect(ObjectId.isValid("not-an-id")).toBe(false);
    expect(ObjectId.isValid("")).toBe(false);
    expect(ObjectId.isValid("123")).toBe(false);
  });

  test("24-char hex string is a valid ObjectId", () => {
    expect(ObjectId.isValid("507f1f77bcf86cd799439011")).toBe(true);
  });

  // Property 7: DELETE Idempotence — ObjectId validation aspect
  // Feature: product-catalog-tryon, Property 7: DELETE Idempotence
  test("Property 7: valid ObjectId strings always pass isValid", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[0-9a-f]{24}$/),
        (hexId) => {
          // 24-char hex strings are valid ObjectIds
          return ObjectId.isValid(hexId) === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
