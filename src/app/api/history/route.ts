/**
 * GET    /api/history        - Retrieve global try-on history from MongoDB
 * POST   /api/history        - Save a new history item
 * DELETE /api/history?id=xxx - Remove a history item
 *
 * History is global (shared across all users) — acts as a public review feed.
 * Results are stored in the `history` collection in the `jewelry-catalog` DB.
 */

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { TryOnHistoryItem } from "@/types";

const COLLECTION = "history";
const MAX_HISTORY_ITEMS = 100;

// ─── Serialise MongoDB doc → TryOnHistoryItem ─────────────────────────────────

function serializeItem(doc: Record<string, unknown>): TryOnHistoryItem {
  return {
    id: (doc._id as ObjectId).toString(),
    userImageUrl: doc.userImageUrl as string,
    jewelryImageUrl: doc.jewelryImageUrl as string,
    resultImageUrl: doc.resultImageUrl as string,
    jewelryCategory: doc.jewelryCategory as TryOnHistoryItem["jewelryCategory"],
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : (doc.createdAt as string),
  };
}

// ─── GET — return all history newest first ────────────────────────────────────

export async function GET() {
  try {
    const db = await getDb();
    const docs = await db
      .collection(COLLECTION)
      .find({})
      .sort({ createdAt: -1 })
      .limit(MAX_HISTORY_ITEMS)
      .toArray();

    const history = docs.map((d) => serializeItem(d as Record<string, unknown>));
    return NextResponse.json({ success: true, history });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[API /history GET]", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── POST — save a new history item ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userImageUrl, jewelryImageUrl, resultImageUrl, jewelryCategory } = body;

    if (!userImageUrl || !jewelryImageUrl || !resultImageUrl) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = await getDb();

    const doc = {
      userImageUrl,
      jewelryImageUrl,
      resultImageUrl,
      jewelryCategory: jewelryCategory ?? "necklace",
      createdAt: new Date(),
    };

    const result = await db.collection(COLLECTION).insertOne(doc);

    // Keep collection capped at MAX_HISTORY_ITEMS (delete oldest beyond limit)
    const count = await db.collection(COLLECTION).countDocuments();
    if (count > MAX_HISTORY_ITEMS) {
      const oldest = await db
        .collection(COLLECTION)
        .find({})
        .sort({ createdAt: 1 })
        .limit(count - MAX_HISTORY_ITEMS)
        .toArray();
      const idsToDelete = oldest.map((d) => d._id);
      await db.collection(COLLECTION).deleteMany({ _id: { $in: idsToDelete } });
    }

    const item: TryOnHistoryItem = {
      id: result.insertedId.toString(),
      userImageUrl,
      jewelryImageUrl,
      resultImageUrl,
      jewelryCategory: jewelryCategory ?? "necklace",
      createdAt: doc.createdAt.toISOString(),
    };

    return NextResponse.json({ success: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[API /history POST]", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── DELETE — remove a history item by id ────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { success: false, error: "id parameter is required" },
      { status: 400 }
    );
  }

  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid history item id" },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const result = await db
      .collection(COLLECTION)
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "History item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[API /history DELETE]", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
