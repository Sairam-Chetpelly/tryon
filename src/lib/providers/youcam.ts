/**
 * PerfectCorp / YouCam API Provider  (V2 Bearer-token flow)
 *
 * Base URL : https://yce-api-01.makeupar.com
 * Auth     : Authorization: Bearer <API_KEY>
 *
 * ── Correct 4-step workflow ──────────────────────────────────────────────────
 *
 * Step 1 – Register each file (JSON POST to FILE endpoint)
 *   POST /s2s/v2.0/file/2d-vto/<type>
 *   Body : { files: [{ content_type, file_name, file_size }] }
 *   Resp : { status:200, data:{ files:[{ file_id, requests:[{ method:"PUT", url, headers }] }] } }
 *
 * Step 2 – Upload raw bytes to the presigned S3 URL (PUT, no auth header)
 *   PUT <requests[0].url>
 *   Headers: exactly what the API returned (Content-Type + Content-Length)
 *
 * Step 3 – Fire the AI task (JSON POST to TASK endpoint — different path!)
 *   POST /s2s/v2.0/task/2d-vto/<type>
 *   Body : { files: [{ file_id, file_name, file_size, content_type }] }
 *          (same schema as registration — file_size is REQUIRED here too)
 *   Resp : { status:200, data:{ task_id } }
 *
 * Step 4 – Poll task status
 *   GET /s2s/v2.0/task/<task_id>
 *   Resp : { status:200, data:{ task_status:"success"|"error"|"processing", results:[{ url }] } }
 *
 * Source: https://dlthub.com/workspace/source/perfect-corp
 *         https://docs.perfectcorp.com/reference/ai_necklace/v1.0
 */

import axios, { AxiosError } from "axios";
import type { TryOnRequest, TryOnResponse } from "@/types";

// ── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = (
  process.env.YOUCAM_API_BASE_URL ?? "https://yce-api-01.makeupar.com"
).replace(/\/$/, "");

const API_KEY = process.env.YOUCAM_API_KEY ?? "";

/** Map our category → PerfectCorp endpoint path segment */
const ENDPOINT_MAP: Record<string, string> = {
  necklace: "necklace",
  pendant:  "necklace",
  earrings: "earring",
  ring:     "ring",
  bracelet: "bracelet",
  anklet:   "bracelet",
  brooch:   "necklace",
  tiara:    "necklace",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface FileEntry {
  file_id:      string;
  file_name:    string;
  file_size:    number;
  content_type: string;
  requests:     Array<{ method: string; url: string; headers: Record<string, string> }>;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function youcamTryOn(
  request: TryOnRequest
): Promise<TryOnResponse> {
  const start = Date.now();

  if (!API_KEY) {
    throw new Error(
      "YouCam API key not configured. Set YOUCAM_API_KEY in .env.local"
    );
  }

  const seg         = ENDPOINT_MAP[request.jewelryCategory] ?? "necklace";
  const fileEndpoint = `${BASE_URL}/s2s/v2.0/file/2d-vto/${seg}`;
  const taskEndpoint = `${BASE_URL}/s2s/v2.0/task/2d-vto/${seg}`;
  const auth         = { Authorization: `Bearer ${API_KEY}` };

  console.log(`[YouCam] category=${request.jewelryCategory} → seg=${seg}`);
  console.log(`[YouCam] fileEndpoint=${fileEndpoint}`);
  console.log(`[YouCam] taskEndpoint=${taskEndpoint}`);

  try {
    const personBuf  = Buffer.from(request.userImageBase64,    "base64");
    const jewelryBuf = Buffer.from(request.jewelryImageBase64, "base64");

    // ── Steps 1 & 2: register + upload both images in parallel ───────────────
    const [personEntry, jewelryEntry] = await Promise.all([
      registerAndUpload(fileEndpoint, auth, personBuf,  "person.jpg"),
      registerAndUpload(fileEndpoint, auth, jewelryBuf, "jewelry.jpg"),
    ]);

    console.log(`[YouCam] Uploaded — person_file_id=${personEntry.file_id}  jewelry_file_id=${jewelryEntry.file_id}`);

    // ── Step 3: fire the AI task on the TASK endpoint ─────────────────────────
    // Task body — allOf schema (all fields required together):
    //   src_file_id   = person/selfie file_id
    //   ref_file_ids  = [jewelry file_id]
    //   source_info   = { file_id, name } wrapper for the source (person) image
    //   object_infos  = [{ file_id, name }] wrapper for the object (jewelry) images
    const taskBody = {
      src_file_id:  personEntry.file_id,
      ref_file_ids: [jewelryEntry.file_id],
      source_info:  { file_id: personEntry.file_id,  name: "person.jpg" },
      object_infos: [{ file_id: jewelryEntry.file_id, name: "jewelry.jpg" }],
    };

    console.log(`[YouCam] Firing task — body:`, JSON.stringify(taskBody));

    const taskRes = await axios.post(taskEndpoint, taskBody, {
      headers: { ...auth, "Content-Type": "application/json" },
      timeout: 30000,
    });

    console.log(`[YouCam] Task response:`, JSON.stringify(taskRes.data));

    const taskId: string =
      taskRes.data?.data?.task_id ??
      taskRes.data?.task_id;

    if (!taskId) {
      throw new Error(
        `No task_id in task response: ${JSON.stringify(taskRes.data)}`
      );
    }

    console.log(`[YouCam] Task fired — task_id=${taskId}`);

    // ── Step 4: poll for result ───────────────────────────────────────────────
    const resultUrl = await pollTaskResult(seg, taskId, auth);

    return {
      success: true,
      resultImageUrl: resultUrl,
      processingTimeMs: Date.now() - start,
      provider: "youcam",
    };
  } catch (error) {
    const axiosError = error as AxiosError<Record<string, unknown>>;

    if (axiosError.response) {
      console.error(
        `[YouCam] HTTP ${axiosError.response.status}:`,
        JSON.stringify(axiosError.response.data)
      );
      const msg =
        (axiosError.response.data?.message as string) ??
        (axiosError.response.data?.error as string) ??
        axiosError.message;
      throw new Error(`AI error: ${msg}`);
    }

    throw new Error(`AI error: ${(error as Error).message}`);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Step 1: Register a file → get presigned upload URL + file_id
 * Step 2: PUT raw bytes to the presigned URL
 * Returns the full FileEntry (we need file_size for the task body).
 */
async function registerAndUpload(
  fileEndpoint: string,
  auth: Record<string, string>,
  imageBuffer: Buffer,
  fileName: string
): Promise<FileEntry> {
  // Step 1 – register: JSON POST with file metadata
  const regRes = await axios.post(
    fileEndpoint,
    {
      files: [
        {
          content_type: "image/jpeg",
          file_name:    fileName,
          file_size:    imageBuffer.byteLength,
        },
      ],
    },
    {
      headers: { ...auth, "Content-Type": "application/json" },
      timeout: 15000,
    }
  );

  // Response: { status:200, data:{ files:[{ file_id, file_name, file_size, content_type, requests:[...] }] } }
  const fileEntry: FileEntry =
    regRes.data?.data?.files?.[0] ??
    regRes.data?.files?.[0];

  if (!fileEntry?.file_id || !fileEntry?.requests?.[0]?.url) {
    throw new Error(
      `File registration failed — unexpected response: ${JSON.stringify(regRes.data)}`
    );
  }

  const uploadUrl     = fileEntry.requests[0].url;
  const uploadHeaders = fileEntry.requests[0].headers ?? {};

  // Step 2 – PUT raw bytes to the presigned S3 URL (no Bearer auth here)
  await axios.put(uploadUrl, imageBuffer, {
    headers: {
      "Content-Type":   "image/jpeg",
      "Content-Length": imageBuffer.byteLength,
      ...uploadHeaders, // exact signed headers from the API response
    },
    timeout:          60000,
    maxBodyLength:    Infinity,
    maxContentLength: Infinity,
  });

  console.log(`[YouCam] Uploaded ${fileName} (${imageBuffer.byteLength} bytes) → file_id=${fileEntry.file_id}`);

  return fileEntry;
}

/**
 * Step 4: Poll task status.
 * GET /s2s/v2.0/task/2d-vto/{seg}/{task_id}
 * Confirmed from official OpenAPI spec:
 *   Operations: POST /s2s/v2.0/task/2d-vto/necklace
 *               GET  /s2s/v2.0/task/2d-vto/necklace/{task_id}
 */
async function pollTaskResult(
  seg: string,
  taskId: string,
  auth: Record<string, string>,
  maxAttempts = 40,
  intervalMs  = 3000
): Promise<string> {
  const pollUrl = `${BASE_URL}/s2s/v2.0/task/2d-vto/${seg}/${encodeURIComponent(taskId)}`;
  console.log(`[YouCam] Poll URL: ${pollUrl}`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const statusRes = await axios.get(pollUrl, {
      headers: auth,
      timeout: 15000,
    });

    const data       = statusRes.data?.data ?? statusRes.data;
    const taskStatus = (data?.task_status ?? data?.status ?? "") as string;

    console.log(`[YouCam] Poll ${attempt}/${maxAttempts} — status=${taskStatus} full=${JSON.stringify(statusRes.data)}`);

    if (taskStatus === "success" || taskStatus === "completed") {
      const resultUrl: string =
        data?.results?.url              ??
        data?.results?.download_url     ??
        data?.results?.image_url        ??
        data?.results?.[0]?.url         ??
        data?.results?.[0]?.download_url ??
        data?.results?.[0]?.image_url   ??
        data?.result?.url               ??
        data?.result_url                ??
        data?.output_url                ??
        data?.image_url;

      if (!resultUrl) {
        throw new Error(
          `Task succeeded but no result URL found: ${JSON.stringify(data)}`
        );
      }
      return resultUrl;
    }

    if (taskStatus === "error" || taskStatus === "failed") {
      const errMsg =
        data?.error_message ?? data?.error ?? data?.message ?? "Processing failed";
      throw new Error(`AI failed: ${errMsg}`);
    }
    // "processing" | "pending" | "" → keep polling
  }

  throw new Error(
    `YouCam task timed out after ${(maxAttempts * intervalMs) / 1000}s`
  );
}
