"use client";

/**
 * HistoryPanel
 * Displays the user's previous try-on results.
 */

import React, { useEffect, useState } from "react";
import { History, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { JEWELRY_CATEGORIES } from "@/lib/constants";
import type { TryOnHistoryItem } from "@/types";
import toast from "react-hot-toast";

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HistoryPanel({ isOpen, onClose }: HistoryPanelProps) {
  const [history, setHistory] = useState<TryOnHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/history?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
        toast.success("Removed from history");
      }
    } catch {
      toast.error("Failed to delete item");
    }
  };

  const getCategoryLabel = (value: string) => {
    return JEWELRY_CATEGORIES.find((c) => c.value === value)?.label ?? value;
  };

  const getCategoryIcon = (value: string) => {
    return JEWELRY_CATEGORIES.find((c) => c.value === value)?.icon ?? "💎";
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl",
          "flex flex-col transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        aria-label="Try-on history"
        role="complementary"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-jewelry-primary" />
            <h2 className="text-lg font-bold text-gray-800">Try-On History</h2>
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
                <div
                  key={i}
                  className="h-24 rounded-xl bg-gray-100 animate-pulse"
                />
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
                <div
                  key={item.id}
                  className="group relative flex gap-3 p-3 rounded-xl border border-gray-100 hover:border-gold-200 hover:bg-gold-50 transition-all"
                >
                  {/* Thumbnail grid */}
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
                      className="w-14 h-14 rounded-lg object-cover border-2 border-jewelry-primary"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">
                        {getCategoryIcon(item.jewelryCategory)}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">
                        {getCategoryLabel(item.jewelryCategory)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                    aria-label="Delete history item"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="p-4 border-t border-gray-100">
            <p className="text-xs text-center text-gray-400">
              History is stored temporarily and resets on server restart.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
