"use client";

/**
 * TryOnForm
 * Main form component that orchestrates the entire try-on workflow:
 * 1. Upload user photo
 * 2. Upload jewelry image
 * 3. Select jewelry category
 * 4. Submit to AI API
 * 5. Display result
 */

import React, { useState, useCallback } from "react";
import { Wand2, AlertCircle, Info } from "lucide-react";
import toast from "react-hot-toast";

import ImageDropzone from "@/components/ImageDropzone";
import CategorySelector from "@/components/CategorySelector";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import ResultDisplay from "@/components/ResultDisplay";

import { cn, revokeImagePreview, generateId } from "@/lib/utils";
import { DEFAULT_CATEGORY } from "@/lib/constants";
import type {
  UploadedImage,
  JewelryCategory,
  TryOnSession,
  TryOnStatus,
} from "@/types";

export default function TryOnForm() {
  const [userImage, setUserImage] = useState<UploadedImage | null>(null);
  const [jewelryImage, setJewelryImage] = useState<UploadedImage | null>(null);
  const [category, setCategory] = useState<JewelryCategory>(DEFAULT_CATEGORY);
  const [status, setStatus] = useState<TryOnStatus>("idle");
  const [session, setSession] = useState<TryOnSession | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isProcessing = status === "processing" || status === "uploading";
  const canSubmit = !!userImage && !!jewelryImage && !isProcessing;

  // ---- Handlers ----

  const handleUserImageSelected = useCallback((image: UploadedImage) => {
    setUserImage((prev) => {
      revokeImagePreview(prev);
      return image;
    });
    setErrorMessage(null);
  }, []);

  const handleJewelryImageSelected = useCallback((image: UploadedImage) => {
    setJewelryImage((prev) => {
      revokeImagePreview(prev);
      return image;
    });
    setErrorMessage(null);
  }, []);

  const handleClearUser = useCallback(() => {
    revokeImagePreview(userImage);
    setUserImage(null);
  }, [userImage]);

  const handleClearJewelry = useCallback(() => {
    revokeImagePreview(jewelryImage);
    setJewelryImage(null);
  }, [jewelryImage]);

  const handleReset = useCallback(() => {
    revokeImagePreview(userImage);
    revokeImagePreview(jewelryImage);
    setUserImage(null);
    setJewelryImage(null);
    setCategory(DEFAULT_CATEGORY);
    setStatus("idle");
    setSession(null);
    setErrorMessage(null);
  }, [userImage, jewelryImage]);

  const handleSubmit = async () => {
    if (!userImage || !jewelryImage) return;

    setStatus("uploading");
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("userImage", userImage.file);
    formData.append("jewelryImage", jewelryImage.file);
    formData.append("category", category);

    setStatus("processing");

    try {
      const response = await fetch("/api/tryon", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? `Server error: ${response.status}`);
      }

      // Build session object
      const completedSession: TryOnSession = {
        id: generateId(),
        userImage,
        jewelryImage,
        jewelryCategory: category,
        status: "completed",
        resultImageUrl: data.resultImageUrl ?? null,
        errorMessage: null,
        createdAt: new Date(),
        processingTimeMs: data.processingTimeMs,
        // Attach base64 if URL not provided
        ...(data.resultImageBase64 && {
          resultImageBase64: data.resultImageBase64,
        }),
      };

      setSession(completedSession);
      setStatus("completed");
      toast.success("Your jewelry try-on is ready!");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      setErrorMessage(message);
      setStatus("error");
      toast.error(message);
    }
  };

  // ---- Render ----

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Processing overlay */}
      {isProcessing && <ProcessingOverlay />}

      {/* Result view */}
      {status === "completed" && session && (
        <div className="animate-fade-in">
          <ResultDisplay
            session={
              session as TryOnSession & { resultImageBase64?: string }
            }
            onReset={handleReset}
            onDownload={() => {}}
          />
        </div>
      )}

      {/* Upload form */}
      {status !== "completed" && (
        <div className="flex flex-col gap-8">
          {/* Provider info banner — only shown in demo mode */}
          {process.env.NEXT_PUBLIC_TRYON_PROVIDER === "demo" && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <strong>Demo Mode Active</strong> — Using built-in image
                compositor. For realistic AI results, set{" "}
                <code className="bg-blue-100 px-1 rounded">TRYON_PROVIDER=youcam</code>{" "}
                in <code className="bg-blue-100 px-1 rounded">.env.local</code>.
              </div>
            </div>
          )}

          {/* Image upload row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImageDropzone
              label="Your Photo"
              sublabel="Full body or portrait"
              onImageSelected={handleUserImageSelected}
              currentImage={userImage}
              onClear={handleClearUser}
              disabled={isProcessing}
              showCamera
            />

            <ImageDropzone
              label="Jewelry Image"
              sublabel="Clear background preferred"
              onImageSelected={handleJewelryImageSelected}
              currentImage={jewelryImage}
              onClear={handleClearJewelry}
              disabled={isProcessing}
            />
          </div>

          {/* Category selector */}
          <CategorySelector
            selected={category}
            onChange={setCategory}
            disabled={isProcessing}
          />

          {/* Error message */}
          {errorMessage && (
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
            <Wand2 className={cn("w-5 h-5", canSubmit && "animate-pulse")} />
            {isProcessing ? "Processing..." : "Generate Try-On"}
          </button>

          {/* Helper text */}
          {!canSubmit && !isProcessing && (
            <p className="text-center text-sm text-gray-400">
              {!userImage && !jewelryImage
                ? "Upload both photos to get started"
                : !userImage
                ? "Upload your photo to continue"
                : "Upload a jewelry image to continue"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
