"use client";

/**
 * ResultDisplay
 * Shows the AI-generated try-on result with before/after comparison slider.
 */

import React, { useState, useRef } from "react";
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from "react-compare-slider";
import {
  Download,
  RotateCcw,
  Share2,
  ZoomIn,
  ZoomOut,
  Clock,
  Sparkles,
} from "lucide-react";
import { cn, downloadImage, downloadBase64Image, formatDuration } from "@/lib/utils";
import type { ResultDisplayProps, TryOnSession } from "@/types";
import toast from "react-hot-toast";

type ViewMode = "result" | "compare" | "side-by-side";

// Extended session type that may carry base64 result
type SessionWithBase64 = TryOnSession & { resultImageBase64?: string };

export default function ResultDisplay({
  session,
  onReset,
  onDownload,
}: ResultDisplayProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("result");
  const [isZoomed, setIsZoomed] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const extSession = session as SessionWithBase64;

  if (!extSession.resultImageUrl && !extSession.resultImageBase64) return null;

  // Build the result image src
  const resultSrc = extSession.resultImageUrl
    ? extSession.resultImageUrl
    : `data:image/jpeg;base64,${extSession.resultImageBase64}`;

  const userSrc = session.userImage?.preview ?? "";

  const handleDownload = () => {
    if (extSession.resultImageUrl) {
      downloadImage(extSession.resultImageUrl, "jewelry-tryon-result.jpg");
    } else if (extSession.resultImageBase64) {
      downloadBase64Image(extSession.resultImageBase64, "jewelry-tryon-result.jpg");
    }
    toast.success("Image downloaded!");
    onDownload();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Jewelry Try-On",
          text: "Check out how this jewelry looks on me!",
          url: window.location.href,
        });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  return (
    <div
      ref={resultRef}
      className="flex flex-col gap-6 animate-fade-in"
      aria-label="Try-on result"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-jewelry-primary" />
          <h2 className="text-xl font-bold text-gray-800">Your Look</h2>
          {session.processingTimeMs && (
            <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              <Clock className="w-3 h-3" />
              {formatDuration(session.processingTimeMs)}
            </span>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {(["result", "compare", "side-by-side"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
                viewMode === mode
                  ? "bg-white text-jewelry-primary shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {mode === "side-by-side" ? "Split" : mode}
            </button>
          ))}
        </div>
      </div>

      {/* Image Display */}
      <div
        className={cn(
          "rounded-2xl overflow-hidden border-2 border-gold-200 shadow-xl",
          isZoomed && "cursor-zoom-out",
          !isZoomed && "cursor-zoom-in"
        )}
        onClick={() => { if (viewMode !== "result") setViewMode("result"); setIsZoomed(!isZoomed); }}
      >
        {viewMode === "result" && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resultSrc}
              alt="Jewelry try-on result"
              className={cn(
                "w-full object-contain transition-transform duration-300",
                isZoomed ? "scale-150" : "scale-100",
                "max-h-[500px]"
              )}
            />
            {/* Zoom button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomed(!isZoomed);
              }}
              className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
              aria-label={isZoomed ? "Zoom out" : "Zoom in"}
            >
              {isZoomed ? (
                <ZoomOut className="w-4 h-4" />
              ) : (
                <ZoomIn className="w-4 h-4" />
              )}
            </button>
          </div>
        )}

        {viewMode === "compare" && userSrc && (
          <ReactCompareSlider
            itemOne={
              <ReactCompareSliderImage
                src={userSrc}
                alt="Before - Original photo"
                style={{ objectFit: "cover" }}
              />
            }
            itemTwo={
              <ReactCompareSliderImage
                src={resultSrc}
                alt="After - With jewelry"
                style={{ objectFit: "cover" }}
              />
            }
            style={{ height: "500px" }}
            className="w-full"
          />
        )}

        {viewMode === "side-by-side" && userSrc && (
          <div className="grid grid-cols-2 gap-0">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={userSrc}
                alt="Before"
                className="w-full h-[400px] object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md">
                Before
              </div>
            </div>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resultSrc}
                alt="After"
                className="w-full h-[400px] object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-jewelry-primary/90 text-white text-xs px-2 py-1 rounded-md">
                After ✨
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compare hint */}
      {viewMode === "compare" && (
        <p className="text-center text-xs text-gray-400">
          Drag the slider to compare before & after
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-jewelry-primary text-white rounded-xl font-semibold hover:bg-jewelry-secondary transition-colors shadow-md shadow-gold-200"
        >
          <Download className="w-4 h-4" />
          Download Result
        </button>

        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gold-300 text-jewelry-secondary rounded-xl font-semibold hover:bg-gold-50 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>

        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}
