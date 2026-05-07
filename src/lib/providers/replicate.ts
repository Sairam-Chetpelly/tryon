/**
 * Replicate Provider
 * Uses open-source models via Replicate's API as a fallback.
 * Docs: https://replicate.com/docs
 */

import axios, { AxiosError } from "axios";
import type { TryOnRequest, TryOnResponse } from "@/types";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN ?? "";
const REPLICATE_BASE_URL = "https://api.replicate.com/v1";

// Using IDM-VTON model for virtual try-on
const MODEL_VERSION =
  "c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4";

export async function replicateTryOn(
  request: TryOnRequest
): Promise<TryOnResponse> {
  const start = Date.now();

  if (!REPLICATE_API_TOKEN) {
    throw new Error(
      "Replicate API token not configured. Set REPLICATE_API_TOKEN in .env.local"
    );
  }

  try {
    // Create prediction
    const createResponse = await axios.post(
      `${REPLICATE_BASE_URL}/predictions`,
      {
        version: MODEL_VERSION,
        input: {
          human_img: `data:image/jpeg;base64,${request.userImageBase64}`,
          garm_img: `data:image/jpeg;base64,${request.jewelryImageBase64}`,
          garment_des: `${request.jewelryCategory} jewelry`,
          is_checked: true,
          is_checked_crop: false,
          denoise_steps: 30,
          seed: 42,
        },
      },
      {
        headers: {
          Authorization: `Token ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const predictionId: string = createResponse.data.id;

    // Poll for result
    const resultUrl = await pollReplicateResult(predictionId);

    return {
      success: true,
      resultImageUrl: resultUrl,
      processingTimeMs: Date.now() - start,
      provider: "replicate",
    };
  } catch (error) {
    const axiosError = error as AxiosError<{ detail?: string }>;
    const message =
      axiosError.response?.data?.detail ??
      axiosError.message ??
      "Replicate API request failed";

    console.error("[Replicate Provider] Error:", message);
    throw new Error(`Replicate API error: ${message}`);
  }
}

async function pollReplicateResult(
  predictionId: string,
  maxAttempts = 60,
  intervalMs = 3000
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const statusRes = await axios.get(
      `${REPLICATE_BASE_URL}/predictions/${predictionId}`,
      {
        headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` },
        timeout: 10000,
      }
    );

    const { status, output, error } = statusRes.data;

    if (status === "succeeded" && output) {
      // Output can be a string or array
      const url = Array.isArray(output) ? output[0] : output;
      return url as string;
    }

    if (status === "failed" || status === "canceled") {
      throw new Error(`Replicate prediction ${status}: ${error ?? ""}`);
    }
  }

  throw new Error("Replicate prediction timed out after 3 minutes");
}
