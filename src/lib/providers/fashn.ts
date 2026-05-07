/**
 * Fashn.ai Provider
 * Integrates with Fashn.ai's virtual try-on API.
 * Docs: https://fashn.ai/docs
 */

import axios, { AxiosError } from "axios";
import type { TryOnRequest, TryOnResponse } from "@/types";

const FASHN_BASE_URL =
  process.env.FASHN_API_BASE_URL ?? "https://api.fashn.ai/v1";
const FASHN_API_KEY = process.env.FASHN_API_KEY ?? "";

export async function fashnTryOn(request: TryOnRequest): Promise<TryOnResponse> {
  const start = Date.now();

  if (!FASHN_API_KEY) {
    throw new Error(
      "Fashn API key not configured. Set FASHN_API_KEY in .env.local"
    );
  }

  try {
    // Submit try-on request
    const response = await axios.post(
      `${FASHN_BASE_URL}/run`,
      {
        model_image: `data:image/jpeg;base64,${request.userImageBase64}`,
        garment_image: `data:image/jpeg;base64,${request.jewelryImageBase64}`,
        category: mapCategory(request.jewelryCategory),
        mode: "quality",
        num_samples: 1,
      },
      {
        headers: {
          Authorization: `Bearer ${FASHN_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 120000,
      }
    );

    const predictionId: string = response.data.id;

    // Poll for result
    const resultUrl = await pollFashnResult(predictionId);

    return {
      success: true,
      resultImageUrl: resultUrl,
      processingTimeMs: Date.now() - start,
      provider: "fashn",
    };
  } catch (error) {
    const axiosError = error as AxiosError<{ error?: string }>;
    const message =
      axiosError.response?.data?.error ??
      axiosError.message ??
      "Fashn API request failed";

    console.error("[Fashn Provider] Error:", message);
    throw new Error(`Fashn API error: ${message}`);
  }
}

function mapCategory(category: string): string {
  const map: Record<string, string> = {
    necklace: "tops",   // Fashn maps jewelry to body regions
    earrings: "tops",
    ring: "bottoms",
    bracelet: "bottoms",
    anklet: "bottoms",
    brooch: "tops",
    tiara: "tops",
    pendant: "tops",
  };
  return map[category] ?? "tops";
}

async function pollFashnResult(
  predictionId: string,
  maxAttempts = 40,
  intervalMs = 2000
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const statusRes = await axios.get(
      `${FASHN_BASE_URL}/status/${predictionId}`,
      {
        headers: { Authorization: `Bearer ${FASHN_API_KEY}` },
        timeout: 10000,
      }
    );

    const { status, output, error } = statusRes.data;

    if (status === "completed" && output?.[0]) {
      return output[0] as string;
    }

    if (status === "failed") {
      throw new Error(`Fashn processing failed: ${error ?? "unknown error"}`);
    }
  }

  throw new Error("Fashn processing timed out");
}
