// ============================================================
// Core Types for Jewelry Virtual Try-On
// ============================================================

export type JewelryCategory =
  | "necklace"
  | "earrings"
  | "ring"
  | "bracelet"
  | "anklet"
  | "brooch"
  | "tiara"
  | "pendant";

export type TryOnStatus =
  | "idle"
  | "uploading"
  | "processing"
  | "completed"
  | "error";

export type TryOnProvider = "youcam" | "fashn" | "replicate" | "demo";

// ---- Upload Types ----

export interface UploadedImage {
  id: string;
  file: File;
  preview: string; // Object URL for local preview
  name: string;
  size: number;
  type: string;
}

// ---- Try-On Session ----

export interface TryOnSession {
  id: string;
  userImage: UploadedImage | null;
  jewelryImage: UploadedImage | null;
  jewelryCategory: JewelryCategory;
  status: TryOnStatus;
  resultImageUrl: string | null;
  errorMessage: string | null;
  createdAt: Date;
  processingTimeMs?: number;
}

// ---- API Request / Response ----

export interface TryOnRequest {
  userImageBase64: string;
  jewelryImageBase64: string;
  jewelryCategory: JewelryCategory;
  provider?: TryOnProvider;
}

export interface TryOnResponse {
  success: boolean;
  resultImageUrl?: string;
  resultImageBase64?: string;
  processingTimeMs?: number;
  provider?: TryOnProvider;
  error?: string;
}

// ---- History ----

export interface TryOnHistoryItem {
  id: string;
  userImageUrl: string;
  jewelryImageUrl: string;
  resultImageUrl: string;
  jewelryCategory: JewelryCategory;
  createdAt: string;
}

// ---- Jewelry Category Meta ----

export interface JewelryCategoryMeta {
  value: JewelryCategory;
  label: string;
  icon: string;
  description: string;
  placement: string; // e.g. "neck", "ears", "finger"
}

// ---- Component Props ----

export interface ImageDropzoneProps {
  label: string;
  sublabel?: string;
  accept?: Record<string, string[]>;
  maxSizeMB?: number;
  onImageSelected: (image: UploadedImage) => void;
  currentImage: UploadedImage | null;
  onClear: () => void;
  disabled?: boolean;
  className?: string;
  /** Show a "Take Photo" button that opens the device camera */
  showCamera?: boolean;
}

export interface ResultDisplayProps {
  session: TryOnSession;
  onReset: () => void;
  onDownload: () => void;
}

export interface CategorySelectorProps {
  selected: JewelryCategory;
  onChange: (category: JewelryCategory) => void;
  disabled?: boolean;
}
