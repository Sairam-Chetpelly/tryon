/**
 * POST /api/tryon
 * Accepts multipart form data with:
 *   - userImage: File (person photo)
 *   - jewelryImage: File (jewelry photo)
 *   - category: string (jewelry category)
 *
 * Returns JSON with resultImageBase64 or resultImageUrl.
 */

import { NextRequest, NextResponse } from "next/server";
import { processTryOn } from "@/lib/tryon-service";
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/constants";
import type { JewelryCategory, TryOnRequest } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 120; // 2 minutes for AI processing

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();

    const userImageFile = formData.get("userImage") as File | null;
    const jewelryImageFile = formData.get("jewelryImage") as File | null;
    const category = (formData.get("category") as string) ?? "necklace";

    // ---- Validation ----
    if (!userImageFile) {
      return NextResponse.json(
        { success: false, error: "User image is required" },
        { status: 400 }
      );
    }

    if (!jewelryImageFile) {
      return NextResponse.json(
        { success: false, error: "Jewelry image is required" },
        { status: 400 }
      );
    }

    // Validate file types
    if (!ALLOWED_IMAGE_TYPES.includes(userImageFile.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid user image type: ${userImageFile.type}. Allowed: JPG, PNG, WebP`,
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_IMAGE_TYPES.includes(jewelryImageFile.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid jewelry image type: ${jewelryImageFile.type}. Allowed: JPG, PNG, WebP`,
        },
        { status: 400 }
      );
    }

    // Validate file sizes
    if (userImageFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "User image exceeds 10MB limit" },
        { status: 400 }
      );
    }

    if (jewelryImageFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "Jewelry image exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // ---- Convert files to base64 ----
    const userImageBuffer = Buffer.from(await userImageFile.arrayBuffer());
    const jewelryImageBuffer = Buffer.from(
      await jewelryImageFile.arrayBuffer()
    );

    const userImageBase64 = userImageBuffer.toString("base64");
    const jewelryImageBase64 = jewelryImageBuffer.toString("base64");

    // ---- Build request ----
    const tryOnRequest: TryOnRequest = {
      userImageBase64,
      jewelryImageBase64,
      jewelryCategory: category as JewelryCategory,
    };

    // ---- Process with AI provider ----
    console.log(
      `[API /tryon] Processing try-on for category: ${category}, ` +
        `user image: ${(userImageFile.size / 1024).toFixed(0)}KB, ` +
        `jewelry image: ${(jewelryImageFile.size / 1024).toFixed(0)}KB`
    );

    const result = await processTryOn(tryOnRequest);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error ?? "Processing failed" },
        { status: 500 }
      );
    }

    console.log(
      `[API /tryon] Completed in ${result.processingTimeMs}ms via ${result.provider}`
    );

    return NextResponse.json({
      success: true,
      resultImageBase64: result.resultImageBase64,
      resultImageUrl: result.resultImageUrl,
      processingTimeMs: result.processingTimeMs,
      provider: result.provider,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[API /tryon] Unhandled error:", error);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  const provider = process.env.TRYON_PROVIDER ?? "demo";
  return NextResponse.json({
    status: "ok",
    provider,
    message: "Jewelry Try-On API is running",
  });
}
