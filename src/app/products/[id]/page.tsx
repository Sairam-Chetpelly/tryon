"use client";

/**
 * Product Detail Page
 *
 * Client Component that fetches a single product by id and renders its full
 * details. Handles 404 and malformed-id cases with a "Product not found"
 * message and a link back to /products.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Gem,
  ChevronRight,
  Home,
  ShoppingBag,
  Wand2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from "lucide-react";

import Header from "@/components/Header";
import HistoryPanel from "@/components/HistoryPanel";
import TryOnModal from "@/components/catalog/TryOnModal";

import { cn } from "@/lib/utils";
import type { Product } from "@/types/catalog";

// ─── Price formatter ──────────────────────────────────────────────────────────

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : null;

  // ── State ──────────────────────────────────────────────────────────────────
  const [product, setProduct] = useState<Product | null>(null);
  const [status, setStatus] = useState<"loading" | "found" | "not_found" | "error">("loading");
  const [imageError, setImageError] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // ── Fetch product ──────────────────────────────────────────────────────────

  const fetchProduct = useCallback(async () => {
    if (!id) {
      setStatus("not_found");
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch(`/api/products/${id}`);

      if (res.status === 404 || res.status === 400) {
        setStatus("not_found");
        return;
      }

      if (!res.ok) {
        setStatus("error");
        return;
      }

      const data: Product = await res.json();
      setProduct(data);
      setStatus("found");
    } catch {
      setStatus("error");
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderBreadcrumb = (productName?: string) => (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-sm text-gray-500 flex-wrap"
    >
      <Link
        href="/"
        className="flex items-center gap-1 hover:text-jewelry-primary transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Home</span>
      </Link>
      <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      <Link
        href="/products"
        className="hover:text-jewelry-primary transition-colors"
      >
        Products
      </Link>
      {productName && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span
            className="text-gray-800 font-medium truncate max-w-[200px] sm:max-w-xs"
            aria-current="page"
          >
            {productName}
          </span>
        </>
      )}
    </nav>
  );

  // ── Loading state ──────────────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-jewelry-light">
        <Header onHistoryOpen={() => setIsHistoryOpen(true)} />
        <HistoryPanel isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />

        <main className="flex-1 py-8 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Breadcrumb skeleton */}
            <div className="h-5 w-56 bg-gray-200 rounded animate-pulse" />

            <div className="bg-white rounded-2xl border border-gold-100 shadow-sm overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                {/* Image skeleton */}
                <div className="aspect-square bg-gray-100 animate-pulse" />
                {/* Details skeleton */}
                <div className="p-8 flex flex-col gap-4">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="space-y-2 mt-2">
                    <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                    <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse" />
                    <div className="h-4 w-4/6 bg-gray-100 rounded animate-pulse" />
                  </div>
                  <div className="mt-auto h-12 w-full bg-gray-200 rounded-2xl animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="py-6 px-4 bg-jewelry-dark text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gem className="w-4 h-4 text-gold-400" />
            <span className="text-gold-300 font-semibold text-sm">JewelTry</span>
          </div>
          <p className="text-gray-500 text-xs">
            AI Jewelry Virtual Try-On · Built with Next.js &amp; Tailwind CSS
          </p>
        </footer>
      </div>
    );
  }

  // ── Not found / error state (Requirement 6.3) ──────────────────────────────

  if (status === "not_found" || status === "error") {
    return (
      <div className="min-h-screen flex flex-col bg-jewelry-light">
        <Header onHistoryOpen={() => setIsHistoryOpen(true)} />
        <HistoryPanel isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />

        <main className="flex-1 flex items-center justify-center py-16 px-4">
          <div className="text-center max-w-md animate-fade-in">
            {/* Icon */}
            <div className="w-24 h-24 rounded-2xl bg-gold-50 border-2 border-gold-200 flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Gem className="w-12 h-12 text-jewelry-primary opacity-40" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Product not found
            </h1>
            <p className="text-gray-500 mb-8">
              {status === "error"
                ? "Something went wrong while loading this product."
                : "This product doesn't exist or may have been removed."}
            </p>

            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-jewelry-primary text-white font-semibold hover:bg-jewelry-secondary transition-colors shadow-md hover:shadow-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Products
            </Link>
          </div>
        </main>

        <footer className="py-6 px-4 bg-jewelry-dark text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gem className="w-4 h-4 text-gold-400" />
            <span className="text-gold-300 font-semibold text-sm">JewelTry</span>
          </div>
          <p className="text-gray-500 text-xs">
            AI Jewelry Virtual Try-On · Built with Next.js &amp; Tailwind CSS
          </p>
        </footer>
      </div>
    );
  }

  // ── Product found (Requirement 6.1, 6.2) ──────────────────────────────────

  if (!product) return null;

  return (
    <div className="min-h-screen flex flex-col bg-jewelry-light">
      <Header onHistoryOpen={() => setIsHistoryOpen(true)} />
      <HistoryPanel isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />

      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* ── Breadcrumb (Requirement 6.5) ── */}
          <div className="bg-white rounded-2xl border border-gold-100 shadow-sm px-5 py-3">
            {renderBreadcrumb(product.name)}
          </div>

          {/* ── Product Card ── */}
          <div className="bg-white rounded-2xl border border-gold-100 shadow-sm overflow-hidden animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">

              {/* ── Product Image ── */}
              <div className="relative bg-gray-50 flex items-center justify-center aspect-square border-b md:border-b-0 md:border-r border-gold-100">
                {imageError ? (
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <Gem className="w-20 h-20 opacity-30" />
                    <span className="text-sm">Image unavailable</span>
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-contain p-6"
                    onError={() => setImageError(true)}
                  />
                )}

                {/* Out of stock overlay badge */}
                {!product.inStock && (
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 shadow-sm">
                      <XCircle className="w-3.5 h-3.5" />
                      Out of Stock
                    </span>
                  </div>
                )}
              </div>

              {/* ── Product Details ── */}
              <div className="p-8 flex flex-col gap-5">

                {/* Category badge */}
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gold-100 text-jewelry-secondary border border-gold-200 capitalize">
                    {product.category}
                  </span>
                </div>

                {/* Name */}
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                  {product.name}
                </h1>

                {/* Price */}
                <p className="text-3xl font-bold text-jewelry-primary">
                  {formatPrice(product.price)}
                </p>

                {/* Stock status */}
                <div className="flex items-center gap-2">
                  {product.inStock ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-green-700">In Stock</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-medium text-red-600">Out of Stock</span>
                    </>
                  )}
                </div>

                {/* Description */}
                {product.description && (
                  <div className="border-t border-gold-100 pt-4">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Description
                    </h2>
                    <p className="text-gray-700 leading-relaxed text-sm">
                      {product.description}
                    </p>
                  </div>
                )}

                {/* ── Try On button (Requirement 6.4) ── */}
                <div className="mt-auto pt-4 flex flex-col gap-3">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className={cn(
                      "w-full flex items-center justify-center gap-3 py-4 px-8 rounded-2xl",
                      "text-base font-bold tracking-wide transition-all duration-300",
                      "shadow-lg focus:outline-none focus:ring-4 focus:ring-gold-300",
                      "bg-gradient-to-r from-jewelry-primary to-gold-500 text-white",
                      "hover:from-jewelry-secondary hover:to-gold-600 hover:shadow-xl hover:scale-[1.02] active:scale-[0.99]"
                    )}
                    aria-label={`Try on ${product.name}`}
                  >
                    <Wand2 className="w-5 h-5 animate-pulse" />
                    Try On
                  </button>

                  <Link
                    href="/products"
                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl border border-gold-200 text-jewelry-secondary font-medium text-sm hover:bg-gold-50 transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Back to Catalog
                  </Link>
                </div>
              </div>
            </div>
          </div>
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

      {/* ── TryOn Modal (Requirement 6.4) ── */}
      <TryOnModal
        product={product}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
