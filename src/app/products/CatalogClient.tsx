"use client";

/**
 * CatalogClient
 *
 * Client Component that owns all interactivity for the /products catalog page:
 *   - Fetches GET /api/products on mount (and on retry)
 *   - Manages loading / error / empty / data states
 *   - Manages the active category filter (client-side, no page reload)
 *   - Manages TryOnModal open/close state and the selected product
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */

import { useState, useEffect, useCallback } from "react";
import { AlertCircle, RefreshCw, Gem, Sparkles } from "lucide-react";

import Header from "@/components/Header";
import CategoryFilterBar from "@/components/catalog/CategoryFilterBar";
import ProductGrid from "@/components/catalog/ProductGrid";
import TryOnModal from "@/components/catalog/TryOnModal";
import HistoryPanel from "@/components/HistoryPanel";

import type { Product } from "@/types/catalog";
import type { JewelryCategory } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type FetchStatus = "idle" | "loading" | "success" | "error";

// ─── Component ────────────────────────────────────────────────────────────────

export default function CatalogClient() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<
    JewelryCategory | "all"
  >("all");

  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // ── Fetch products ─────────────────────────────────────────────────────────

  const fetchProducts = useCallback(async () => {
    setFetchStatus("loading");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/products");

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data?.error ?? `Failed to load products (HTTP ${response.status})`
        );
      }

      const data: Product[] = await response.json();
      setProducts(data);
      setFetchStatus("success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load products";
      setErrorMessage(message);
      setFetchStatus("error");
    }
  }, []);

  // Fetch on mount (Requirement 4.3)
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const isLoading = fetchStatus === "loading" || fetchStatus === "idle";
  const isError = fetchStatus === "error";
  const isSuccess = fetchStatus === "success";

  /** Products filtered by the active category (client-side, Requirement 4.7) */
  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  // ── Modal handlers ─────────────────────────────────────────────────────────

  const handleTryOn = useCallback((product: Product) => {
    setModalProduct(product);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    // Keep modalProduct in state briefly so the closing animation doesn't
    // flash an empty modal; clear it after the transition.
    setTimeout(() => setModalProduct(null), 300);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-jewelry-light">
      {/* Navigation (Requirement 4.8 — consistent theme) */}
      <Header onHistoryOpen={() => setIsHistoryOpen(true)} />

      {/* History Drawer */}
      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* ── Page Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-jewelry-dark via-gray-900 to-gray-800 text-white py-12 px-4">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-jewelry-primary/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-gold-400/10 blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-4 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-gold-300" />
            <span className="text-gold-200">Virtual Try-On Catalog</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 leading-tight">
            Discover Our{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-gold-300 via-jewelry-accent to-gold-400">
              Jewelry Collection
            </span>
          </h1>

          <p className="text-base text-gray-300 max-w-xl mx-auto">
            Browse our curated selection and try any piece on virtually — no
            fitting room needed.
          </p>
        </div>
      </section>

      {/* ── Main Content ── */}
      <main className="flex-1 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* ── Error Banner (Requirement 4.4) ── */}
          {isError && (
            <div
              className="flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-2xl shadow-sm animate-fade-in"
              role="alert"
            >
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-700">
                  Failed to load products
                </p>
                {errorMessage && (
                  <p className="text-sm text-red-600 mt-0.5">{errorMessage}</p>
                )}
              </div>
              <button
                type="button"
                onClick={fetchProducts}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 shrink-0"
                aria-label="Retry loading products"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          )}

          {/* ── Category Filter Bar (Requirements 4.6, 4.7) ── */}
          {/* Show filter bar when not in error state */}
          {!isError && (
            <div className="bg-white rounded-2xl border border-gold-100 shadow-sm px-4 py-3">
              <CategoryFilterBar
                selected={selectedCategory}
                onChange={setSelectedCategory}
              />
            </div>
          )}

          {/* ── Product Grid (Requirements 4.2, 4.3) ── */}
          {!isError && (
            <>
              {/* Empty state — only shown on successful empty response (Requirement 4.5) */}
              {isSuccess && filteredProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                  <div className="w-20 h-20 rounded-2xl bg-gold-50 border-2 border-gold-200 flex items-center justify-center mb-5 shadow-sm">
                    <Gem className="w-10 h-10 text-jewelry-primary opacity-50" />
                  </div>
                  <p className="text-lg font-semibold text-gray-700 mb-1">
                    {selectedCategory === "all"
                      ? "No products available yet."
                      : `No ${selectedCategory} products available yet.`}
                  </p>
                  {selectedCategory !== "all" && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("all")}
                      className="mt-3 text-sm text-jewelry-primary hover:text-jewelry-secondary font-medium underline underline-offset-2 transition-colors"
                    >
                      View all categories
                    </button>
                  )}
                </div>
              )}

              {/* Grid — shown while loading or when there are products */}
              {(isLoading || filteredProducts.length > 0) && (
                <ProductGrid
                  products={filteredProducts}
                  onTryOn={handleTryOn}
                  isLoading={isLoading}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="py-6 px-4 bg-jewelry-dark text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Gem className="w-4 h-4 text-gold-400" />
          <span className="text-gold-300 font-semibold text-sm">JewelTry</span>
        </div>
        <p className="text-gray-500 text-xs">
          AI Jewelry Virtual Try-On · Built with Next.js &amp; Tailwind CSS
        </p>
      </footer>

      {/* ── TryOn Modal (Requirements 7.x) ── */}
      {modalProduct && (
        <TryOnModal
          product={modalProduct}
          isOpen={isModalOpen}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
