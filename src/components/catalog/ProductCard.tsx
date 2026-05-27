/**
 * ProductCard
 *
 * Displays a single product in the catalog grid. Shows the product image
 * (with a <Gem /> fallback on load error), name (linked to /products/[id]),
 * price formatted as currency, a category badge, and a "Try On" button.
 *
 * When `inStock` is false, an "Out of Stock" badge is shown and the "Try On"
 * button is visually disabled — but clicking it still opens the modal per
 * Requirement 5.5.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Gem } from "lucide-react";
import type { Product } from "@/types/catalog";

export interface ProductCardProps {
  product: Product;
  onTryOn: (product: Product) => void;
}

/** Format a numeric price as a locale currency string (USD). */
function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(price);
}

/** Capitalise the first letter of a category string for display. */
function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export default function ProductCard({ product, onTryOn }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);

  const imageUrl = product.thumbnailUrl ?? product.imageUrl;

  return (
    <article className="bg-white rounded-2xl border border-gold-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
      {/* ── Product image ── */}
      <div className="relative w-full aspect-square bg-gold-50 overflow-hidden">
        {imgError ? (
          /* Fallback icon when image fails to load (Requirement 5.2) */
          <div
            className="absolute inset-0 flex items-center justify-center"
            aria-label="Product image unavailable"
          >
            <Gem className="w-16 h-16 text-jewelry-primary opacity-40" />
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            onError={() => setImgError(true)}
          />
        )}

        {/* Out of Stock badge (Requirement 5.5) */}
        {!product.inStock && (
          <span className="absolute top-2 right-2 bg-gray-800 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            Out of Stock
          </span>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Category badge (Requirement 5.1) */}
        <span className="inline-flex items-center self-start px-2.5 py-0.5 rounded-full text-xs font-medium bg-jewelry-light text-jewelry-secondary border border-gold-200">
          {formatCategory(product.category)}
        </span>

        {/* Product name — links to detail page (Requirement 5.4) */}
        <Link
          href={`/products/${product._id}`}
          className="text-base font-semibold text-gray-900 hover:text-jewelry-primary transition-colors duration-150 line-clamp-2 leading-snug"
        >
          {product.name}
        </Link>

        {/* Price (Requirement 5.1) */}
        <p className="text-jewelry-primary font-bold text-lg">
          {formatPrice(product.price)}
        </p>

        {/* Spacer pushes button to the bottom */}
        <div className="flex-1" />

        {/* Try On button (Requirements 5.3, 5.5) */}
        <button
          type="button"
          onClick={() => onTryOn(product)}
          aria-disabled={!product.inStock}
          className={[
            "w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-jewelry-primary focus-visible:ring-offset-1",
            product.inStock
              ? "bg-jewelry-primary text-white hover:bg-jewelry-secondary active:scale-95 shadow-sm"
              : "bg-gold-100 text-gray-400 cursor-not-allowed",
          ].join(" ")}
        >
          Try On
        </button>
      </div>
    </article>
  );
}
