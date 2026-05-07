/**
 * Try-On Service
 * Routes requests to the appropriate AI provider based on TRYON_PROVIDER env var.
 */

import type { TryOnRequest, TryOnResponse, TryOnProvider } from "@/types";

export async function processTryOn(
  request: TryOnRequest
): Promise<TryOnResponse> {
  const provider = (process.env.TRYON_PROVIDER ?? "demo") as TryOnProvider;

  console.log(`[TryOn Service] Using provider: ${provider}`);

  switch (provider) {
    case "youcam": {
      const { youcamTryOn } = await import("@/lib/providers/youcam");
      return youcamTryOn(request);
    }

    case "fashn": {
      const { fashnTryOn } = await import("@/lib/providers/fashn");
      return fashnTryOn(request);
    }

    case "replicate": {
      const { replicateTryOn } = await import("@/lib/providers/replicate");
      return replicateTryOn(request);
    }

    case "demo":
    default: {
      const { demoTryOn } = await import("@/lib/providers/demo");
      return demoTryOn(request);
    }
  }
}

/**
 * Validate that the required API credentials are present for the active provider.
 */
export function validateProviderConfig(): {
  valid: boolean;
  provider: TryOnProvider;
  message?: string;
} {
  const provider = (process.env.TRYON_PROVIDER ?? "demo") as TryOnProvider;

  switch (provider) {
    case "youcam":
      if (!process.env.YOUCAM_API_KEY || !process.env.YOUCAM_API_SECRET) {
        return {
          valid: false,
          provider,
          message: "YOUCAM_API_KEY and YOUCAM_API_SECRET are required",
        };
      }
      break;

    case "fashn":
      if (!process.env.FASHN_API_KEY) {
        return {
          valid: false,
          provider,
          message: "FASHN_API_KEY is required",
        };
      }
      break;

    case "replicate":
      if (!process.env.REPLICATE_API_TOKEN) {
        return {
          valid: false,
          provider,
          message: "REPLICATE_API_TOKEN is required",
        };
      }
      break;

    case "demo":
      // No credentials needed
      break;
  }

  return { valid: true, provider };
}
