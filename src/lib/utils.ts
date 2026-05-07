import { clsx, type ClassValue } from "clsx";
import { v4 as uuidv4 } from "uuid";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/constants";
import type { UploadedImage } from "@/types";

// ---- Class Name Utility ----
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// ---- ID Generation ----
export function generateId(): string {
  return uuidv4();
}

// ---- File Validation ----
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(file: File): FileValidationResult {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: JPG, PNG, WebP. Got: ${file.type}`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File too large (${sizeMB}MB). Maximum allowed: 10MB`,
    };
  }

  return { valid: true };
}

// ---- File → UploadedImage ----
export function createUploadedImage(file: File): UploadedImage {
  return {
    id: generateId(),
    file,
    preview: URL.createObjectURL(file),
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

// ---- Revoke Object URLs (memory cleanup) ----
export function revokeImagePreview(image: UploadedImage | null) {
  if (image?.preview) {
    URL.revokeObjectURL(image.preview);
  }
}

// ---- File → Base64 ----
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix (e.g. "data:image/jpeg;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// ---- Base64 → Blob ----
export function base64ToBlob(base64: string, mimeType = "image/jpeg"): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// ---- Download Image ----
export function downloadImage(url: string, filename = "jewelry-tryon.jpg") {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ---- Download Base64 Image ----
export function downloadBase64Image(
  base64: string,
  filename = "jewelry-tryon.jpg",
  mimeType = "image/jpeg"
) {
  const blob = base64ToBlob(base64, mimeType);
  const url = URL.createObjectURL(blob);
  downloadImage(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---- Format File Size ----
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---- Format Duration ----
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ---- Capitalize ----
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ---- Sleep ----
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
