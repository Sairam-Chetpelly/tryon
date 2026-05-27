/**
 * Tests for upload API validation logic.
 *
 * Property 9: Upload MIME Type Validation
 * Validates: Requirements 3.4, 3.5
 */

import fc from "fast-check";

// ---- Constants (mirrored from the upload route) ----

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Extracted MIME type validation logic from the upload route handler.
 */
function validateMimeType(mimeType: string): string | null {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return "Only JPEG, PNG, and WebP images are allowed";
  }
  return null;
}

/**
 * Extracted file size validation logic from the upload route handler.
 */
function validateFileSize(sizeBytes: number): string | null {
  if (sizeBytes > MAX_FILE_SIZE) {
    return "Image must be 10 MB or smaller";
  }
  return null;
}

// ---- MIME type validation tests ----

describe("Upload MIME type validation", () => {
  test("accepts image/jpeg", () => {
    expect(validateMimeType("image/jpeg")).toBeNull();
  });

  test("accepts image/png", () => {
    expect(validateMimeType("image/png")).toBeNull();
  });

  test("accepts image/webp", () => {
    expect(validateMimeType("image/webp")).toBeNull();
  });

  test("rejects image/gif", () => {
    expect(validateMimeType("image/gif")).toBe(
      "Only JPEG, PNG, and WebP images are allowed"
    );
  });

  test("rejects image/bmp", () => {
    expect(validateMimeType("image/bmp")).toBe(
      "Only JPEG, PNG, and WebP images are allowed"
    );
  });

  test("rejects application/pdf", () => {
    expect(validateMimeType("application/pdf")).toBe(
      "Only JPEG, PNG, and WebP images are allowed"
    );
  });

  test("rejects empty string", () => {
    expect(validateMimeType("")).toBe(
      "Only JPEG, PNG, and WebP images are allowed"
    );
  });

  test("rejects text/plain", () => {
    expect(validateMimeType("text/plain")).toBe(
      "Only JPEG, PNG, and WebP images are allowed"
    );
  });

  // ---- Property 9: Upload MIME Type Validation ----
  // Feature: product-catalog-tryon, Property 9: Upload MIME Type Validation

  test("Property 9: any MIME type outside the allowed set returns the correct error", () => {
    const disallowedMimeArb = fc
      .string({ minLength: 1, maxLength: 100 })
      .filter((s) => !ALLOWED_MIME_TYPES.includes(s));

    fc.assert(
      fc.property(disallowedMimeArb, (mimeType) => {
        const result = validateMimeType(mimeType);
        return result === "Only JPEG, PNG, and WebP images are allowed";
      }),
      { numRuns: 100 }
    );
  });

  test("Property 9: all allowed MIME types pass validation", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALLOWED_MIME_TYPES),
        (mimeType) => {
          return validateMimeType(mimeType) === null;
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ---- File size validation tests ----

describe("Upload file size validation", () => {
  test("accepts file exactly at 10 MB limit", () => {
    expect(validateFileSize(MAX_FILE_SIZE)).toBeNull();
  });

  test("accepts file smaller than 10 MB", () => {
    expect(validateFileSize(1024)).toBeNull();
    expect(validateFileSize(5 * 1024 * 1024)).toBeNull();
  });

  test("rejects file larger than 10 MB", () => {
    expect(validateFileSize(MAX_FILE_SIZE + 1)).toBe(
      "Image must be 10 MB or smaller"
    );
  });

  test("rejects file of 11 MB", () => {
    expect(validateFileSize(11 * 1024 * 1024)).toBe(
      "Image must be 10 MB or smaller"
    );
  });

  test("accepts file of 0 bytes", () => {
    expect(validateFileSize(0)).toBeNull();
  });

  // Property: files over 10 MB always fail
  test("Property: any file size over 10 MB always returns the size error", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MAX_FILE_SIZE + 1, max: MAX_FILE_SIZE * 10 }),
        (size) => {
          return validateFileSize(size) === "Image must be 10 MB or smaller";
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: files at or under 10 MB always pass
  test("Property: any file size at or under 10 MB always passes", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_FILE_SIZE }),
        (size) => {
          return validateFileSize(size) === null;
        }
      ),
      { numRuns: 100 }
    );
  });
});
