"use client";

/**
 * EnhancedResultDisplay
 *
 * Shows the AI-generated try-on result with three view tabs:
 *   - "Result"  — single result image
 *   - "Compare" — draggable ReactCompareSlider (disabled when no user photo)
 *   - "Split"   — side-by-side Before / After (disabled when no user photo)
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

import React, { useState, useEffect } from "react";
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from "react-compare-slider";
import { Download, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = "result" | "compare" | "split";

export interface EnhancedResultDisplayProps {
  /** URL of the AI-generated try-on result image */
  resultImageUrl: string;
  /** Data-URL (or any URL) of the user's original photo; null when unavailable */
  userImagePreview: string | null;
  /** URL of the product image used in the try-on */
  productImageUrl: string;
  /** Called when the user clicks "Try Another" — should reset to upload state */
  onTryAnother: () => void;
}

// ─── Tab configuration ────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string }[] = [
  { id: "result", label: "Result" },
  { id: "compare", label: "Compare" },
  { id: "split", label: "Split" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function EnhancedResultDisplay({
  resultImageUrl,
  userImagePreview,
  productImageUrl,
  onTryAnother,
}: EnhancedResultDisplayProps) {
  const [activeTab, setActiveTab] = useState<TabId>("result");

  // Requirement 8.7 — if userImagePreview becomes null while Compare/Split is
  // active, immediately switch back to the Result tab.
  useEffect(() => {
    if (!userImagePreview && (activeTab === "compare" || activeTab === "split")) {
      setActiveTab("result");
    }
  }, [userImagePreview, activeTab]);

  // Whether the Compare / Split tabs should be disabled
  const comparisonDisabled = !userImagePreview;

  // ── Tab click handler ──────────────────────────────────────────────────────
  const handleTabClick = (tabId: TabId) => {
    if (tabId !== "result" && comparisonDisabled) return; // guard disabled tabs
    setActiveTab(tabId);
  };

  // ── Download handler ───────────────────────────────────────────────────────
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = resultImageUrl;
    link.download = "jewelry-tryon-result.jpg";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 animate-fade-in" aria-label="Try-on result">
      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-jewelry-primary" aria-hidden="true" />
        <h2 className="text-xl font-bold text-gray-800">Your Look</h2>
      </div>

      {/* ── Tab Bar (Requirement 8.2) ── */}
      <div
        className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 self-start"
        role="tablist"
        aria-label="View mode"
      >
        {TABS.map(({ id, label }) => {
          const isDisabled = id !== "result" && comparisonDisabled;
          const isActive = activeTab === id;

          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              onClick={() => handleTabClick(id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
                isActive
                  ? "bg-white text-jewelry-primary shadow-sm"
                  : isDisabled
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-500 hover:text-gray-700 cursor-pointer"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Image Panel ── */}
      <div className="rounded-2xl overflow-hidden border-2 border-gold-200 shadow-xl">
        {/* Result tab (Requirement 8.1) */}
        {activeTab === "result" && (
          <div className="relative bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resultImageUrl}
              alt="Jewelry try-on result"
              className="w-full object-contain max-h-[500px]"
            />
          </div>
        )}

        {/* Compare tab — ReactCompareSlider (Requirement 8.3) */}
        {activeTab === "compare" && userImagePreview && (
          <ReactCompareSlider
            itemOne={
              <ReactCompareSliderImage
                src={userImagePreview}
                alt="Before — original photo"
                style={{ objectFit: "cover" }}
              />
            }
            itemTwo={
              <ReactCompareSliderImage
                src={resultImageUrl}
                alt="After — with jewelry"
                style={{ objectFit: "cover" }}
              />
            }
            style={{ height: "500px" }}
            className="w-full"
          />
        )}

        {/* Split tab — side-by-side Before / After (Requirement 8.4) */}
        {activeTab === "split" && userImagePreview && (
          <div className="grid grid-cols-2 gap-0">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={userImagePreview}
                alt="Before"
                className="w-full h-[400px] object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md font-medium">
                Before
              </div>
            </div>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resultImageUrl}
                alt="After"
                className="w-full h-[400px] object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-jewelry-primary/90 text-white text-xs px-2 py-1 rounded-md font-medium">
                After ✨
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compare hint */}
      {activeTab === "compare" && (
        <p className="text-center text-xs text-gray-400">
          Drag the slider to compare before &amp; after
        </p>
      )}

      {/* ── Action Buttons (Requirements 8.5, 8.6) ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Download button — saves result image (Requirement 8.5) */}
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-jewelry-primary text-white rounded-xl font-semibold hover:bg-jewelry-secondary transition-colors shadow-md shadow-gold-200"
          aria-label="Download result image"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Download
        </button>

        {/* Try Another button — resets to upload state (Requirement 8.6) */}
        <button
          onClick={onTryAnother}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          aria-label="Try another photo"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          Try Another
        </button>
      </div>
    </div>
  );
}
