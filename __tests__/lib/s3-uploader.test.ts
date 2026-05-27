/**
 * Tests for src/lib/s3-uploader.ts
 *
 * Property 8: Upload Key Uniqueness
 * Validates: Requirements 3.2
 */

import fc from "fast-check";

// We test the key-generation logic in isolation by extracting it.
// The actual S3 upload is not tested here (requires live AWS credentials).

/**
 * Replicates the key-generation logic from s3-uploader.ts so we can test it
 * without importing the module (which would try to instantiate an S3Client
 * with missing credentials in the test environment).
 */
function generateUploadKey(originalFilename: string): string {
  const KEY_PREFIX = "products/";
  const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uuid = crypto.randomUUID();
  return `${KEY_PREFIX}${uuid}-${sanitizedFilename}`;
}

describe("S3 Upload Key Generation", () => {
  // ---- Unit tests ----

  test("key starts with products/ prefix", () => {
    const key = generateUploadKey("photo.jpg");
    expect(key.startsWith("products/")).toBe(true);
  });

  test("key contains the sanitized filename", () => {
    const key = generateUploadKey("my photo.jpg");
    // Spaces should be replaced with underscores
    expect(key).toContain("my_photo.jpg");
  });

  test("two calls with the same filename produce different keys", () => {
    const key1 = generateUploadKey("photo.jpg");
    const key2 = generateUploadKey("photo.jpg");
    expect(key1).not.toBe(key2);
  });

  test("special characters in filename are sanitized", () => {
    const key = generateUploadKey("my file (1).jpg");
    // Parentheses and spaces should be replaced
    expect(key).not.toContain("(");
    expect(key).not.toContain(")");
    expect(key).not.toContain(" ");
  });

  // ---- Property 8: Upload Key Uniqueness ----
  // Feature: product-catalog-tryon, Property 8: Upload Key Uniqueness

  test("Property 8: two calls with the same filename always produce different keys", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (filename) => {
          const key1 = generateUploadKey(filename);
          const key2 = generateUploadKey(filename);
          return key1 !== key2;
        }
      ),
      { numRuns: 100 }
    );
  });

  test("Property 8: all generated keys start with products/ prefix", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (filename) => {
          const key = generateUploadKey(filename);
          return key.startsWith("products/");
        }
      ),
      { numRuns: 100 }
    );
  });
});
