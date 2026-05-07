/**
 * Demo Provider
 * Returns a composite mock result by overlaying the jewelry image
 * on the user image using sharp (server-side).
 * Used when TRYON_PROVIDER=demo or no API keys are configured.
 */

import type { TryOnRequest, TryOnResponse } from "@/types";
import { sleep } from "@/lib/utils";

export async function demoTryOn(request: TryOnRequest): Promise<TryOnResponse> {
  const start = Date.now();

  // Simulate processing delay
  await sleep(2500);

  try {
    // Dynamically import sharp (server-only)
    const sharp = (await import("sharp")).default;

    const userBuffer = Buffer.from(request.userImageBase64, "base64");
    const jewelryBuffer = Buffer.from(request.jewelryImageBase64, "base64");

    // Get user image dimensions
    const userMeta = await sharp(userBuffer).metadata();
    const userWidth = userMeta.width ?? 800;
    const userHeight = userMeta.height ?? 1000;

    // Determine overlay size and position based on jewelry category
    const overlayConfig = getOverlayConfig(
      request.jewelryCategory,
      userWidth,
      userHeight
    );

    // Resize jewelry image to fit the overlay area
    const resizedJewelry = await sharp(jewelryBuffer)
      .resize(overlayConfig.width, overlayConfig.height, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    // Composite jewelry onto user image
    const resultBuffer = await sharp(userBuffer)
      .resize(userWidth, userHeight)
      .composite([
        {
          input: resizedJewelry,
          left: overlayConfig.left,
          top: overlayConfig.top,
          blend: "over",
        },
      ])
      .jpeg({ quality: 90 })
      .toBuffer();

    const resultBase64 = resultBuffer.toString("base64");

    return {
      success: true,
      resultImageBase64: resultBase64,
      processingTimeMs: Date.now() - start,
      provider: "demo",
    };
  } catch (error) {
    console.error("[Demo Provider] Error:", error);

    // Fallback: return the user image as-is with a note
    return {
      success: true,
      resultImageBase64: request.userImageBase64,
      processingTimeMs: Date.now() - start,
      provider: "demo",
    };
  }
}

/**
 * Returns overlay position/size config based on jewelry category
 * and image dimensions. These are rough heuristic placements.
 */
function getOverlayConfig(
  category: string,
  imgWidth: number,
  imgHeight: number
) {
  const configs: Record<
    string,
    { widthRatio: number; heightRatio: number; leftRatio: number; topRatio: number }
  > = {
    necklace:  { widthRatio: 0.5,  heightRatio: 0.15, leftRatio: 0.25, topRatio: 0.28 },
    earrings:  { widthRatio: 0.55, heightRatio: 0.20, leftRatio: 0.22, topRatio: 0.18 },
    ring:      { widthRatio: 0.15, heightRatio: 0.10, leftRatio: 0.60, topRatio: 0.65 },
    bracelet:  { widthRatio: 0.25, heightRatio: 0.10, leftRatio: 0.55, topRatio: 0.60 },
    anklet:    { widthRatio: 0.20, heightRatio: 0.08, leftRatio: 0.40, topRatio: 0.88 },
    brooch:    { widthRatio: 0.15, heightRatio: 0.15, leftRatio: 0.42, topRatio: 0.38 },
    tiara:     { widthRatio: 0.40, heightRatio: 0.12, leftRatio: 0.30, topRatio: 0.02 },
    pendant:   { widthRatio: 0.20, heightRatio: 0.15, leftRatio: 0.40, topRatio: 0.30 },
  };

  const cfg = configs[category] ?? configs.necklace;

  return {
    width:  Math.round(imgWidth  * cfg.widthRatio),
    height: Math.round(imgHeight * cfg.heightRatio),
    left:   Math.round(imgWidth  * cfg.leftRatio),
    top:    Math.round(imgHeight * cfg.topRatio),
  };
}
