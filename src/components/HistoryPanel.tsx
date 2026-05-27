"use client";

/**
 * HistoryPanel
 * Slide-in drawer showing global try-on history.
 * Clicking any item opens a full detail modal that matches the post-tryon
 * result UI exactly — Result / Compare / Split tabs + person photo + jewelry photo.
 */

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from "react-compare-slider";
import {
  History,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  User,
  Gem,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { JEWELRY_CATEGORIES } from "@/lib/constants";
import type { TryOnHistoryItem } from "@/types";
import toast from "react-hot-toast";

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Tab definition ───────────────────────────────────────────────────────────

type TabId = "result" | "compare" | "split" | "person" | "jewelry";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "result",  label: "Result",  icon: "✨" },
  { id: "compare", label: "Compare", icon: "⇄"  },
  { id: "split",   label: "Split",   icon: "▥"  },
  { id: "person",  label: "Person",  icon: "👤" },
  { id: "jewelry", label: "Jewelry", icon: "💎" },
];

// ─── Detail Modal ─────────────────────────────────────────────────────────────

interface DetailModalProps {
  item: TryOnHistoryItem;
  items: TryOnHistoryItem[];
  onClose: () => void;
  onNavigate: (item: TryOnHistoryItem) => void;
}

function DetailModal({ item, items, onClose, onNavigate }: DetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("result");

  const currentIndex = items.findIndex((i) => i.id === item.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;

  // Reset to result tab when item changes
  useEffect(() => { setActiveTab("result"); }, [item.id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft"  && hasPrev) onNavigate(items[currentIndex - 1]);
      if (e.key === "ArrowRight" && hasNext)  onNavigate(items[currentIndex + 1]);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, hasPrev, hasNext, items, currentIndex, onNavigate]);

  const getCategoryLabel = (v: string) =>
    JEWELRY_CATEGORIES.find((c) => c.value === v)?.label ?? v;
  const getCategoryIcon = (v: string) =>
    JEWELRY_CATEGORIES.find((c) => c.value === v)?.icon ?? "💎";

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = item.resultImageUrl;
    link.download = `tryon-result-${item.id}.jpg`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Image downloaded!");
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Try-on detail"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-fade-in">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gold-50 border border-gold-200 flex items-center justify-center text-lg">
              {getCategoryIcon(item.jewelryCategory)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-jewelry-primary" />
                <p className="text-sm font-bold text-gray-800">
                  {getCategoryLabel(item.jewelryCategory)} Try-On
                </p>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(item.createdAt).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* ── Tab Bar — matches EnhancedResultDisplay style ── */}
        <div className="px-5 pt-4 shrink-0">
          <div
            className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-full"
            role="tablist"
            aria-label="View mode"
          >
            {TABS.map(({ id, label, icon }) => {
              const needsUserPhoto = id === "compare" || id === "split";
              const isDisabled = needsUserPhoto && !item.userImageUrl;
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={isActive}
                  aria-disabled={isDisabled}
                  disabled={isDisabled}
                  onClick={() => !isDisabled && setActiveTab(id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    isActive
                      ? "bg-white text-jewelry-primary shadow-sm"
                      : isDisabled
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-500 hover:text-gray-700 cursor-pointer"
                  )}
                >
                  <span className="hidden sm:inline">{icon}</span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Image Panel ── */}
        <div className="flex-1 overflow-hidden mx-5 mt-4 rounded-2xl border-2 border-gold-200 shadow-xl bg-gray-50 min-h-[280px] flex items-center justify-center">

          {/* Result tab */}
          {activeTab === "result" && (
            <div className="w-full h-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.resultImageUrl}
                alt="Try-on result"
                className="w-full max-h-[420px] object-contain"
              />
            </div>
          )}

          {/* Compare tab — ReactCompareSlider */}
          {activeTab === "compare" && item.userImageUrl && (
            <ReactCompareSlider
              itemOne={
                <ReactCompareSliderImage
                  src={item.userImageUrl}
                  alt="Before — original photo"
                  style={{ objectFit: "cover" }}
                />
              }
              itemTwo={
                <ReactCompareSliderImage
                  src={item.resultImageUrl}
                  alt="After — with jewelry"
                  style={{ objectFit: "cover" }}
                />
              }
              style={{ height: "420px", width: "100%" }}
            />
          )}

          {/* Split tab — side-by-side */}
          {activeTab === "split" && item.userImageUrl && (
            <div className="grid grid-cols-2 w-full h-full">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.userImageUrl}
                  alt="Before"
                  className="w-full h-[420px] object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md font-medium">
                  Before
                </div>
              </div>
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.resultImageUrl}
                  alt="After"
                  className="w-full h-[420px] object-cover"
                />
                <div className="absolute bottom-2 right-2 bg-jewelry-primary/90 text-white text-xs px-2 py-1 rounded-md font-medium">
                  After ✨
                </div>
              </div>
            </div>
          )}

          {/* Person photo tab */}
          {activeTab === "person" && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <User className="w-3.5 h-3.5" />
                Original Photo
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.userImageUrl}
                alt="Person photo"
                className="max-h-[380px] max-w-full object-contain rounded-xl"
              />
            </div>
          )}

          {/* Jewelry photo tab */}
          {activeTab === "jewelry" && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <Gem className="w-3.5 h-3.5" />
                Jewelry Used
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.jewelryImageUrl}
                alt="Jewelry"
                className="max-h-[380px] max-w-full object-contain rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Compare hint */}
        {activeTab === "compare" && (
          <p className="text-center text-xs text-gray-400 mt-2 shrink-0">
            Drag the slider to compare before &amp; after
          </p>
        )}

        {/* ── Action Buttons — matches EnhancedResultDisplay ── */}
        <div className="flex flex-col sm:flex-row items-center gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
          {/* Download */}
          <button
            onClick={handleDownload}
            className="flex-1 w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-jewelry-primary text-white rounded-xl font-semibold hover:bg-jewelry-secondary transition-colors shadow-md shadow-gold-200"
          >
            <Download className="w-4 h-4" />
            Download
          </button>

          {/* Prev / Next navigation */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => hasPrev && onNavigate(items[currentIndex - 1])}
              disabled={!hasPrev}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:border-gold-300 hover:text-jewelry-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 px-1.5 tabular-nums">
              {currentIndex + 1} / {items.length}
            </span>
            <button
              onClick={() => hasNext && onNavigate(items[currentIndex + 1])}
              disabled={!hasNext}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:border-gold-300 hover:text-jewelry-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main HistoryPanel ────────────────────────────────────────────────────────

export default function HistoryPanel({ isOpen, onClose }: HistoryPanelProps) {
  const [history, setHistory]       = useState<TryOnHistoryItem[]>([]);
  const [loading, setLoading]       = useState(false);
  const [mounted, setMounted]       = useState(false);
  const [selectedItem, setSelectedItem] = useState<TryOnHistoryItem | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/history");
      const data = await res.json();
      if (data.success) setHistory(data.history);
    } catch {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isOpen) fetchHistory(); }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen || selectedItem ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen, selectedItem]);

  // Escape closes drawer (modal handles its own Escape)
  useEffect(() => {
    if (!isOpen || selectedItem) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen, onClose, selectedItem]);

  const getCategoryLabel = (v: string) =>
    JEWELRY_CATEGORIES.find((c) => c.value === v)?.label ?? v;
  const getCategoryIcon  = (v: string) =>
    JEWELRY_CATEGORIES.find((c) => c.value === v)?.icon ?? "💎";

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Drawer backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          isOpen && !selectedItem
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-[9999] h-full w-full max-w-sm bg-white shadow-2xl",
          "flex flex-col transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        aria-label="Try-on history"
        role="complementary"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-jewelry-primary" />
            <h2 className="text-lg font-bold text-gray-800">Try-On History</h2>
            {history.length > 0 && (
              <span className="text-xs font-semibold bg-gold-100 text-jewelry-secondary px-2 py-0.5 rounded-full border border-gold-200">
                {history.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close history panel"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
              <span className="text-5xl">💎</span>
              <p className="text-gray-500 text-sm">
                No try-ons yet. Upload a photo and jewelry to get started!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="group relative w-full text-left flex gap-3 p-3 rounded-xl border border-gray-100 hover:border-gold-300 hover:bg-gold-50 hover:shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-jewelry-primary"
                  aria-label={`View ${getCategoryLabel(item.jewelryCategory)} try-on`}
                >
                  {/* Thumbnails */}
                  <div className="flex gap-1.5 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.userImageUrl}
                      alt="Person"
                      className="w-14 h-14 rounded-lg object-cover border border-gray-200"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.resultImageUrl}
                      alt="Result"
                      className="w-14 h-14 rounded-lg object-cover border-2 border-jewelry-primary group-hover:border-jewelry-secondary transition-colors"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">{getCategoryIcon(item.jewelryCategory)}</span>
                      <span className="text-sm font-semibold text-gray-700">
                        {getCategoryLabel(item.jewelryCategory)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                    <p className="text-[10px] text-jewelry-primary font-medium mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Tap to view full result →
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="p-4 border-t border-gray-100">
            <p className="text-xs text-center text-gray-400">
              Global history · tap any result to view full size
            </p>
          </div>
        )}
      </aside>

      {/* Detail Modal */}
      {selectedItem && (
        <DetailModal
          item={selectedItem}
          items={history}
          onClose={() => setSelectedItem(null)}
          onNavigate={(item) => setSelectedItem(item)}
        />
      )}
    </>,
    document.body
  );
}
