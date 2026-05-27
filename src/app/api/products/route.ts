import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { serializeProduct, type ProductDocument } from "@/types/catalog";
import { JEWELRY_CATEGORIES } from "@/lib/constants";
import type { JewelryCategory } from "@/types";

// Valid category values derived from the JEWELRY_CATEGORIES constant
const VALID_CATEGORIES = JEWELRY_CATEGORIES.map((c) => c.value) as JewelryCategory[];

/**
 * GET /api/products
 *
 * Returns all products sorted by createdAt descending.
 * Supports optional query params:
 *   ?category=<JewelryCategory>  — filter by category
 *   ?inStock=true                — only return in-stock products
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = request.nextUrl;

    // Build MongoDB filter
    const filter: Record<string, unknown> = {};

    const category = searchParams.get("category");
    if (category) {
      filter.category = category;
    }

    const inStock = searchParams.get("inStock");
    if (inStock === "true") {
      filter.inStock = true;
    }

    const docs = await db
      .collection<ProductDocument>("products")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    const products = docs.map(serializeProduct);

    return NextResponse.json(products);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[API GET /api/products] Unhandled error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 *
 * Creates a new product document in MongoDB.
 * Validates required fields in order: name → price → category → imageUrl.
 * Returns HTTP 201 with the created product on success.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate: name (required string)
    if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Field 'name' is required" },
        { status: 400 }
      );
    }

    // Validate: price (required, must be >= 0)
    if (body.price === undefined || body.price === null) {
      return NextResponse.json(
        { success: false, error: "Field 'price' is required" },
        { status: 400 }
      );
    }
    if (typeof body.price !== "number" || body.price < 0) {
      return NextResponse.json(
        { success: false, error: "Price must be a non-negative number" },
        { status: 400 }
      );
    }

    // Validate: category (required, must be in JEWELRY_CATEGORIES values)
    if (!body.category || typeof body.category !== "string") {
      return NextResponse.json(
        { success: false, error: "Field 'category' is required" },
        { status: 400 }
      );
    }
    if (!VALID_CATEGORIES.includes(body.category as JewelryCategory)) {
      return NextResponse.json(
        { success: false, error: "Invalid jewelry category" },
        { status: 400 }
      );
    }

    // Validate: imageUrl (required string)
    if (
      !body.imageUrl ||
      typeof body.imageUrl !== "string" ||
      body.imageUrl.trim() === ""
    ) {
      return NextResponse.json(
        { success: false, error: "Field 'imageUrl' is required" },
        { status: 400 }
      );
    }

    const now = new Date();

    const doc: ProductDocument = {
      name: body.name.trim(),
      description: body.description ?? "",
      price: body.price,
      category: body.category as JewelryCategory,
      imageUrl: body.imageUrl.trim(),
      thumbnailUrl: body.thumbnailUrl,
      inStock: body.inStock !== undefined ? Boolean(body.inStock) : true,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb();
    const result = await db.collection<ProductDocument>("products").insertOne(doc);

    // Attach the generated _id so serializeProduct can stringify it
    const created: ProductDocument = { ...doc, _id: result.insertedId };
    const product = serializeProduct(created);

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[API POST /api/products] Unhandled error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
