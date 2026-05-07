/**
 * GET  /api/history  - Retrieve try-on history (stored in-memory for demo)
 * POST /api/history  - Save a new history item
 * DELETE /api/history?id=xxx - Remove a history item
 *
 * NOTE: In production, replace the in-memory store with a database
 * (e.g., PostgreSQL via Prisma, or DynamoDB) and AWS S3 for image storage.
 */

import { NextRequest, NextResponse } from "next/server";
import type { TryOnHistoryItem } from "@/types";

// In-memory store (resets on server restart — use a DB in production)
const historyStore: TryOnHistoryItem[] = [];
const MAX_HISTORY_ITEMS = 20;

export async function GET() {
  // Return history sorted newest first
  const sorted = [...historyStore].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({ success: true, history: sorted });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userImageUrl, jewelryImageUrl, resultImageUrl, jewelryCategory } =
      body;

    if (!userImageUrl || !jewelryImageUrl || !resultImageUrl) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const item: TryOnHistoryItem = {
      id: crypto.randomUUID(),
      userImageUrl,
      jewelryImageUrl,
      resultImageUrl,
      jewelryCategory: jewelryCategory ?? "necklace",
      createdAt: new Date().toISOString(),
    };

    // Prepend and cap history
    historyStore.unshift(item);
    if (historyStore.length > MAX_HISTORY_ITEMS) {
      historyStore.splice(MAX_HISTORY_ITEMS);
    }

    return NextResponse.json({ success: true, item });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { success: false, error: "id parameter is required" },
      { status: 400 }
    );
  }

  const index = historyStore.findIndex((item) => item.id === id);
  if (index === -1) {
    return NextResponse.json(
      { success: false, error: "History item not found" },
      { status: 404 }
    );
  }

  historyStore.splice(index, 1);
  return NextResponse.json({ success: true });
}
