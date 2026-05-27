import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { serializeProduct, type ProductDocument } from "@/types/catalog";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/products/[id] — fetch a single product by id
export async function GET(
  _req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid product ID" },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const doc = await db
      .collection<ProductDocument>("products")
      .findOne({ _id: new ObjectId(id) });

    if (!doc) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(serializeProduct(doc));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[API /api/products/[id] GET] Unhandled error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// PATCH /api/products/[id] — update a product by id
export async function PATCH(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid product ID" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const db = await getDb();

    const result = await db
      .collection<ProductDocument>("products")
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { ...body, updatedAt: new Date() } },
        { returnDocument: "after" }
      );

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(serializeProduct(result));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[API /api/products/[id] PATCH] Unhandled error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] — remove a product by id
export async function DELETE(
  _req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid product ID" },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    await db
      .collection<ProductDocument>("products")
      .deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[API /api/products/[id] DELETE] Unhandled error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
