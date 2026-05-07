import type { JewelryCategoryMeta, JewelryCategory } from "@/types";

// ---- File Upload Constraints ----
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

// ---- Jewelry Categories ----
export const JEWELRY_CATEGORIES: JewelryCategoryMeta[] = [
  {
    value: "necklace",
    label: "Necklace",
    icon: "💎",
    description: "Chains, pendants, chokers",
    placement: "neck",
  },
  {
    value: "earrings",
    label: "Earrings",
    icon: "✨",
    description: "Studs, hoops, dangles",
    placement: "ears",
  },
  {
    value: "ring",
    label: "Ring",
    icon: "💍",
    description: "Engagement, fashion, bands",
    placement: "finger",
  },
  {
    value: "bracelet",
    label: "Bracelet",
    icon: "⌚",
    description: "Bangles, chains, cuffs",
    placement: "wrist",
  },
  {
    value: "anklet",
    label: "Anklet",
    icon: "🦶",
    description: "Ankle chains and bracelets",
    placement: "ankle",
  },
  {
    value: "brooch",
    label: "Brooch",
    icon: "🌸",
    description: "Pins and brooches",
    placement: "chest",
  },
  {
    value: "tiara",
    label: "Tiara",
    icon: "👑",
    description: "Tiaras and headpieces",
    placement: "head",
  },
  {
    value: "pendant",
    label: "Pendant",
    icon: "🔮",
    description: "Pendants and charms",
    placement: "neck",
  },
];

export const DEFAULT_CATEGORY: JewelryCategory = "necklace";

// ---- API Endpoints ----
export const API_ROUTES = {
  TRYON: "/api/tryon",
  UPLOAD: "/api/upload",
  HISTORY: "/api/history",
  DOWNLOAD: "/api/download",
} as const;

// ---- Processing Messages ----
export const PROCESSING_MESSAGES = [
  "Analyzing your photo...",
  "Detecting facial features...",
  "Positioning jewelry...",
  "Applying realistic lighting...",
  "Blending shadows and reflections...",
  "Finalizing your look...",
];

// ---- Demo / Placeholder Images ----
// These are used when TRYON_PROVIDER=demo
export const DEMO_RESULT_DELAY_MS = 3000;
