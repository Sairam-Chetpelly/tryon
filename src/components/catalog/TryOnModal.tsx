"use client";

/**
 * TryOnModal
 *
 * Full-screen overlay that hosts the virtual try-on workflow for a catalog product.
 * - Pre-populates the jewelry image slot with the selected product's imageUrl and category.
 * - Accepts a user photo via ImageDropzone.
 * - Calls POST /api/tryon on submit.
 * - Renders EnhancedResultDisplay on success; shows inline error on failure.
 * - Closes on × button click or Escape key.
 * - Applies overflow-hidden to document.body while open.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, Wand2, AlertCircle, Loader2 } from "lucide-react";

import ImageDropzone from "@/components/ImageDropzone";
import EnhancedResultDisplay from "@/components/catalog/EnhancedResultDisplay";

import { cn, revokeImagePreview } from "@/lib/utils";
import type { UploadedImage } from "@/types";
import type { Product } from "@/types/catalog";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TryOnModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

type ModalStatus = "idle" | "processing" | "completed" | "error";

// ─── Component ────────────────────────────────────────────────────────────────

export default function TryOnModal({
  product,
  isOpen,
  onClose,
}: TryOnModalProps) {
  const [userImage, setUserImage] = useState<UploadedImage | null>(null);
  const [status, setStatus] = useState<ModalStatus>("idle");
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ref to the close button for focus management
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // ── Body scroll lock (Requirement 7.8) ──────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isOpen]);

  // ── Escape key handler (Requirement 7.7) ────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // ── Focus close button when modal opens ─────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow the modal to render before focusing
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ── Reset state when modal closes or product changes ────────────────────
  useEffect(() => {
    if (!isOpen) {
      // Clean up object URLs on close
      revokeImagePreview(userImage);
      setUserImage(null);
      setStatus("idle");
      setResultImageUrl(null);
      setErrorMessage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleUserImageSelected = useCallback((image: UploadedImage) => {
    setUserImage((prev) => {
      revokeImagePreview(prev);
      return image;
    });
    setErrorMessage(null);
  }, []);

  const handleClearUserImage = useCallback(() => {
    revokeImagePreview(userImage);
    setUserImage(null);
  }, [userImage]);

  const handleTryAnother = useCallback(() => {
    // Reset to upload state while keeping product image pre-loaded (Requirement 8.6)
    revokeImagePreview(userImage);
    setUserImage(null);
    setStatus("idle");
    setResultImageUrl(null);
    setErrorMessage(null);
  }, [userImage]);

  const handleSubmit = async () => {
    if (!userImage) return;

    setStatus("processing");
    setErrorMessage(null);

    try {
      // Send the jewelry image URL to the server — it fetches it server-side
      // to avoid browser CORS issues with S3 URLs (Requirement 7.4)
      const formData = new FormData();
      formData.append("userImage", userImage.file);
      formData.append("jewelryImageUrl", product.imageUrl);
      formData.append("category", product.category);

      const response = await fetch("/api/tryon", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? `Server error: ${response.status}`);
      }

      // Resolve result image URL — prefer URL, fall back to base64 data URL
      const resolvedUrl =
        data.resultImageUrl ??
        (data.resultImageBase64
          ? `data:image/jpeg;base64,${data.resultImageBase64}`
          : null);

      if (!resolvedUrl) {
        throw new Error("No result image returned from the server.");
      }

      setResultImageUrl(resolvedUrl);
      setStatus("completed");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      setErrorMessage(message);
      setStatus("error");
    }
  };

  // ── Derived state ────────────────────────────────────────────────────────

  const isProcessing = status === "processing";
  const canSubmit = !!userImage && !isProcessing;

  // ── Don't render when closed ─────────────────────────────────────────────
  if (!isOpen) return null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    /* Backdrop — Requirement 7.1: fixed inset-0 z-50 */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Try on ${product.name}`}
    >
      {/* Modal panel */}
      <div className="relative w-full max-w-3xl mx-auto my-6 bg-white rounded-2xl shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              Virtual Try-On
            </h2>
            <p className="text-sm text-gray-500 mt-0.5 truncate max-w-[280px] sm:max-w-none">
              {product.name}
            </p>
          </div>

          {/* × Close button — Requirement 7.6 */}
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-jewelry-primary"
            aria-label="Close try-on modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-6 flex flex-col gap-6">
          {/* ── Result view (Requirement 7.5) ── */}
          {status === "completed" && resultImageUrl && (
            <EnhancedResultDisplay
              resultImageUrl={resultImageUrl}
              userImagePreview={userImage?.preview ?? null}
              productImageUrl={product.imageUrl}
              onTryAnother={handleTryAnother}
            />
          )}

          {/* ── Upload form (shown when not completed) ── */}
          {status !== "completed" && (
            <div className="flex flex-col gap-6">
              {/* Pre-populated jewelry image (Requirement 7.2) */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-jewelry-primary uppercase tracking-wider">
                  Jewelry Image
                </span>
                <div className="relative rounded-2xl overflow-hidden border-2 border-gold-300 shadow-md bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-[200px] object-contain"
                  />
                  {/* Category badge */}
                  <div className="absolute top-2 left-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-jewelry-primary/90 text-white capitalize">
                      {product.category}
                    </span>
                  </div>
                  {/* Pre-populated indicator */}
                  <div className="absolute bottom-2 right-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-black/60 text-white backdrop-blur-sm">
                      Pre-loaded
                    </span>
                  </div>
                </div>
              </div>

              {/* User photo upload (Requirement 7.3) */}
              <ImageDropzone
                label="Your Photo"
                sublabel="Full body or portrait"
                onImageSelected={handleUserImageSelected}
                currentImage={userImage}
                onClear={handleClearUserImage}
                disabled={isProcessing}
                showCamera
              />

              {/* Inline error message (Requirement 7.5 — failure case) */}
              {(status === "error" || errorMessage) && errorMessage && (
                <div
                  className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-fade-in"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <strong>Error:</strong> {errorMessage}
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  "w-full flex items-center justify-center gap-3 py-4 px-8 rounded-2xl",
                  "text-base font-bold tracking-wide transition-all duration-300",
                  "shadow-lg focus:outline-none focus:ring-4 focus:ring-gold-300",
                  canSubmit
                    ? "bg-gradient-to-r from-jewelry-primary to-gold-500 text-white hover:from-jewelry-secondary hover:to-gold-600 hover:shadow-xl hover:scale-[1.02] active:scale-[0.99]"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                )}
                aria-label="Generate jewelry try-on"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Wand2 className={cn("w-5 h-5", canSubmit && "animate-pulse")} />
                    Try On
                  </>
                )}
              </button>

              {/* Helper text */}
              {!canSubmit && !isProcessing && (
                <p className="text-center text-sm text-gray-400">
                  Upload your photo to try on this jewelry
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
