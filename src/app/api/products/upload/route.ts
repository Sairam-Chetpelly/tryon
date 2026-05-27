import { NextRequest, NextResponse } from "next/server";
import { uploadProductImage } from "@/lib/s3-uploader";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No image file provided" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Only JPEG, PNG, and WebP images are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "Image must be 10 MB or smaller" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      const result = await uploadProductImage(buffer, file.name, file.type);
      return NextResponse.json({ url: result.url }, { status: 200 });
    } catch {
      return NextResponse.json(
        { success: false, error: "Image upload failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[API /api/products/upload] Unhandled error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
