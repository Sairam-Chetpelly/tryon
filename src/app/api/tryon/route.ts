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
import { uploadProductImage } from "@/lib/s3-uploader";
import { getDb } from "@/lib/mongodb";
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
    const jewelryImageUrl = formData.get("jewelryImageUrl") as string | null;
    const category = (formData.get("category") as string) ?? "necklace";

    // ---- Validation ----
    if (!userImageFile) {
      return NextResponse.json(
        { success: false, error: "User image is required" },
        { status: 400 }
      );
    }

    if (!jewelryImageFile && !jewelryImageUrl) {
      return NextResponse.json(
        { success: false, error: "Jewelry image is required" },
        { status: 400 }
      );
    }

    // If a URL was provided instead of a file, fetch it server-side (avoids browser CORS)
    let resolvedJewelryFile: File = jewelryImageFile!;
    if (!jewelryImageFile && jewelryImageUrl) {
      try {
        const res = await fetch(jewelryImageUrl);
        if (!res.ok) throw new Error(`Failed to fetch jewelry image: ${res.status}`);
        const blob = await res.blob();
        const contentType = res.headers.get("content-type") ?? "image/jpeg";
        resolvedJewelryFile = new File([blob], "jewelry-image.jpg", { type: contentType });
      } catch (fetchErr) {
        return NextResponse.json(
          { success: false, error: "Could not load jewelry image from URL" },
          { status: 400 }
        );
      }
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

    if (!ALLOWED_IMAGE_TYPES.includes(resolvedJewelryFile.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid jewelry image type: ${resolvedJewelryFile.type}. Allowed: JPG, PNG, WebP`,
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

    if (resolvedJewelryFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "Jewelry image exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // ---- Convert files to base64 ----
    const userImageBuffer = Buffer.from(await userImageFile.arrayBuffer());
    const jewelryImageBuffer = Buffer.from(await resolvedJewelryFile.arrayBuffer());

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
        `jewelry image: ${(resolvedJewelryFile.size / 1024).toFixed(0)}KB`
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

    // ── Upload all images to your S3 bucket and save to global history ───────
    // Always re-upload the result to your own S3 — the AI provider URL may be
    // a signed/expiring URL (e.g. YouCam's 2-hour TTL URLs).
    let persistedResultUrl: string | undefined;

    try {
      // 1. Get result image bytes — from base64 or by fetching the provider URL
      let resultBuffer: Buffer;
      if (result.resultImageBase64) {
        resultBuffer = Buffer.from(result.resultImageBase64, "base64");
      } else if (result.resultImageUrl) {
        const res = await fetch(result.resultImageUrl);
        if (!res.ok) throw new Error(`Failed to fetch result image: ${res.status}`);
        resultBuffer = Buffer.from(await res.arrayBuffer());
      } else {
        throw new Error("No result image data returned from AI provider");
      }

      // 2. Upload result to your S3
      const { url: resultS3Url } = await uploadProductImage(
        resultBuffer,
        `tryon-result-${Date.now()}.jpg`,
        "image/jpeg"
      );
      persistedResultUrl = resultS3Url;
      console.log(`[API /tryon] Result uploaded to S3: ${persistedResultUrl}`);

      // 3. Upload user image to S3
      const { url: persistedUserUrl } = await uploadProductImage(
        userImageBuffer,
        `tryon-user-${Date.now()}.jpg`,
        userImageFile.type
      );

      // 4. Upload jewelry image to S3 (or reuse the original URL if it's already in your bucket)
      let persistedJewelryUrl: string;
      if (jewelryImageUrl && jewelryImageUrl.includes("techiebears-internal.s3")) {
        // Already in your bucket — no need to re-upload
        persistedJewelryUrl = jewelryImageUrl;
      } else {
        const { url } = await uploadProductImage(
          jewelryImageBuffer,
          `tryon-jewelry-${Date.now()}.jpg`,
          resolvedJewelryFile.type
        );
        persistedJewelryUrl = url;
      }

      // 5. Save to MongoDB history
      const db = await getDb();
      await db.collection("history").insertOne({
        userImageUrl: persistedUserUrl,
        jewelryImageUrl: persistedJewelryUrl,
        resultImageUrl: persistedResultUrl,
        jewelryCategory: category,
        createdAt: new Date(),
      });
      console.log("[API /tryon] Saved to global history");
    } catch (historyErr) {
      // Non-critical — log but don't fail the response
      console.error("[API /tryon] Failed to save to S3/history:", historyErr);
    }

    return NextResponse.json({
      success: true,
      resultImageBase64: result.resultImageBase64,
      resultImageUrl: persistedResultUrl ?? result.resultImageUrl,
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
