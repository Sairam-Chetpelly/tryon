"use client";

/**
 * Admin Panel — /products/admin
 *
 * Client-side page for managing the product catalog.
 * Allows adding new products (with image upload), deleting products,
 * and toggling inStock status.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Gem,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Upload,
  AlertCircle,
  X,
  Loader2,
  PackageCheck,
  PackageX,
  ShieldCheck,
} from "lucide-react";

import Header from "@/components/Header";
import HistoryPanel from "@/components/HistoryPanel";

import { cn } from "@/lib/utils";
import { JEWELRY_CATEGORIES } from "@/lib/constants";
import type { Product } from "@/types/catalog";
import type { JewelryCategory } from "@/types";

// ─── Price formatter ──────────────────────────────────────────────────────────

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  description: string;
  price: string;
  category: JewelryCategory;
  imageUrl: string;
  imagePreview: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  price: "",
  category: "necklace",
  imageUrl: "",
  imagePreview: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Per-row operation errors: keyed by product _id
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  // Per-row loading state for delete / toggle
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({});

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch products on mount ────────────────────────────────────────────────

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/products");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const data: Product[] = await res.json();
      setProducts(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ── Image upload ───────────────────────────────────────────────────────────

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview
    const preview = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, imagePreview: preview, imageUrl: "" }));
    setFormError(null);

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);

      const res = await fetch("/api/products/upload", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Image upload failed");
      }

      setForm((prev) => ({ ...prev, imageUrl: data.url }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Image upload failed");
      setForm((prev) => ({ ...prev, imagePreview: "", imageUrl: "" }));
    } finally {
      setIsUploading(false);
    }
  };

  // ── Add product ────────────────────────────────────────────────────────────

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("Product name is required.");
      return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      setFormError("Price must be a non-negative number.");
      return;
    }
    if (!form.imageUrl) {
      setFormError("Please upload an image first.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          price,
          category: form.category,
          imageUrl: form.imageUrl,
          inStock: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to create product");
      }

      // Prepend new product to list
      setProducts((prev) => [data as Product, ...prev]);
      setForm(EMPTY_FORM);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete product ─────────────────────────────────────────────────────────

  const handleDelete = async (product: Product) => {
    setRowErrors((prev) => ({ ...prev, [product._id]: "" }));
    setRowLoading((prev) => ({ ...prev, [product._id]: true }));
    try {
      const res = await fetch(`/api/products/${product._id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to delete product");
      }

      setProducts((prev) => prev.filter((p) => p._id !== product._id));
    } catch (err) {
      setRowErrors((prev) => ({
        ...prev,
        [product._id]: err instanceof Error ? err.message : "Delete failed",
      }));
    } finally {
      setRowLoading((prev) => ({ ...prev, [product._id]: false }));
    }
  };

  // ── Toggle inStock ─────────────────────────────────────────────────────────

  const handleToggleStock = async (product: Product) => {
    setRowErrors((prev) => ({ ...prev, [product._id]: "" }));
    setRowLoading((prev) => ({ ...prev, [product._id]: true }));
    try {
      const res = await fetch(`/api/products/${product._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inStock: !product.inStock }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to update product");
      }

      setProducts((prev) =>
        prev.map((p) => (p._id === product._id ? (data as Product) : p))
      );
    } catch (err) {
      setRowErrors((prev) => ({
        ...prev,
        [product._id]: err instanceof Error ? err.message : "Update failed",
      }));
    } finally {
      setRowLoading((prev) => ({ ...prev, [product._id]: false }));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-jewelry-light">
      {/* Header */}
      <Header onHistoryOpen={() => setIsHistoryOpen(true)} />
      <HistoryPanel isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-jewelry-dark via-gray-900 to-gray-800 text-white py-10 px-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-gold-300" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
              Product Admin Panel
            </h1>
            <p className="text-gray-300 text-sm mt-0.5">
              Add, remove, and manage your jewelry catalog.
            </p>
          </div>
        </div>
      </section>

      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* ── Add Product Form (Requirements 9.3, 9.4, 9.5) ── */}
          <section className="bg-white rounded-2xl border border-gold-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gold-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-jewelry-primary" />
              <h2 className="text-lg font-bold text-gray-800">Add Product</h2>
            </div>

            <form onSubmit={handleAddProduct} className="p-6 space-y-5">
              {/* Form error */}
              {formError && (
                <div
                  className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-fade-in"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                  <button
                    type="button"
                    onClick={() => setFormError(null)}
                    className="ml-auto shrink-0 hover:text-red-900 transition-colors"
                    aria-label="Dismiss error"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="admin-name"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="admin-name"
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g. Gold Pendant Necklace"
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 transition-all"
                    required
                  />
                </div>

                {/* Price */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="admin-price"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Price (INR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="admin-price"
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, price: e.target.value }))
                    }
                    placeholder="e.g. 4999"
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 transition-all"
                    required
                  />
                </div>

                {/* Category */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="admin-category"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="admin-category"
                    value={form.category}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        category: e.target.value as JewelryCategory,
                      }))
                    }
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 transition-all bg-white"
                  >
                    {JEWELRY_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Image upload */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="admin-image"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Product Image <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="admin-image"
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-all",
                        isUploading
                          ? "border-gold-200 bg-gold-50 text-jewelry-secondary cursor-not-allowed"
                          : "border-gray-200 hover:border-gold-300 hover:bg-gold-50 text-gray-600 hover:text-jewelry-primary"
                      )}
                    >
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {isUploading ? "Uploading…" : "Choose Image"}
                    </label>
                    <input
                      id="admin-image"
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={handleImageSelect}
                      disabled={isUploading}
                    />

                    {/* Preview thumbnail */}
                    {form.imagePreview && (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gold-200 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={form.imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        {/* Uploading overlay */}
                        {isUploading && (
                          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 animate-spin text-jewelry-primary" />
                          </div>
                        )}
                        {/* Uploaded indicator */}
                        {!isUploading && form.imageUrl && (
                          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-tl-md flex items-center justify-center">
                            <span className="text-white text-[8px] font-bold">✓</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description — full width */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="admin-description"
                  className="text-sm font-semibold text-gray-700"
                >
                  Description
                </label>
                <textarea
                  id="admin-description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Optional product description…"
                  rows={3}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 transition-all resize-none"
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all",
                    "bg-gradient-to-r from-jewelry-primary to-gold-500 text-white shadow-md",
                    "hover:from-jewelry-secondary hover:to-gold-600 hover:shadow-lg",
                    "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-md"
                  )}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {isSubmitting ? "Adding…" : "Add Product"}
                </button>
              </div>
            </form>
          </section>

          {/* ── Product List (Requirements 9.2, 9.6, 9.7) ── */}
          <section className="bg-white rounded-2xl border border-gold-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gold-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gem className="w-5 h-5 text-jewelry-primary" />
                <h2 className="text-lg font-bold text-gray-800">
                  All Products
                </h2>
                {!isLoading && (
                  <span className="ml-1 text-xs font-semibold bg-gold-100 text-jewelry-secondary px-2 py-0.5 rounded-full border border-gold-200">
                    {products.length}
                  </span>
                )}
              </div>
            </div>

            {/* Load error */}
            {loadError && (
              <div
                className="flex items-start gap-3 m-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{loadError}</span>
              </div>
            )}

            {/* Loading skeleton */}
            {isLoading && (
              <div className="divide-y divide-gray-100">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-40 bg-gray-100 rounded" />
                      <div className="h-3 w-24 bg-gray-100 rounded" />
                    </div>
                    <div className="h-4 w-20 bg-gray-100 rounded" />
                    <div className="h-8 w-20 bg-gray-100 rounded-xl" />
                    <div className="h-8 w-8 bg-gray-100 rounded-xl" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !loadError && products.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-gold-50 border-2 border-gold-200 flex items-center justify-center mb-4">
                  <Gem className="w-8 h-8 text-jewelry-primary opacity-40" />
                </div>
                <p className="text-gray-500 text-sm">
                  No products yet. Add your first product above.
                </p>
              </div>
            )}

            {/* Product rows */}
            {!isLoading && products.length > 0 && (
              <div className="divide-y divide-gray-100">
                {products.map((product) => (
                  <div key={product._id}>
                    <div className="flex items-center gap-4 px-6 py-4 hover:bg-gold-50/40 transition-colors">
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-gold-100 bg-gray-50 shrink-0 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>

                      {/* Name + category */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {product.name}
                        </p>
                        <span className="inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gold-100 text-jewelry-secondary border border-gold-200 capitalize">
                          {product.category}
                        </span>
                      </div>

                      {/* Price */}
                      <p className="text-sm font-bold text-jewelry-primary shrink-0 hidden sm:block">
                        {formatPrice(product.price)}
                      </p>

                      {/* inStock toggle (Requirement 9.7) */}
                      <button
                        onClick={() => handleToggleStock(product)}
                        disabled={rowLoading[product._id]}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shrink-0",
                          product.inStock
                            ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                            : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100",
                          rowLoading[product._id] && "opacity-60 cursor-not-allowed"
                        )}
                        aria-label={`Toggle stock status for ${product.name}`}
                        title={product.inStock ? "Mark as out of stock" : "Mark as in stock"}
                      >
                        {rowLoading[product._id] ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : product.inStock ? (
                          <ToggleRight className="w-3.5 h-3.5" />
                        ) : (
                          <ToggleLeft className="w-3.5 h-3.5" />
                        )}
                        {product.inStock ? (
                          <PackageCheck className="w-3.5 h-3.5" />
                        ) : (
                          <PackageX className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {product.inStock ? "In Stock" : "Out of Stock"}
                        </span>
                      </button>

                      {/* Delete button (Requirement 9.6) */}
                      <button
                        onClick={() => handleDelete(product)}
                        disabled={rowLoading[product._id]}
                        className={cn(
                          "p-2 rounded-xl border border-gray-200 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-all shrink-0",
                          rowLoading[product._id] && "opacity-60 cursor-not-allowed"
                        )}
                        aria-label={`Delete ${product.name}`}
                      >
                        {rowLoading[product._id] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Per-row error (Requirement 9.8) */}
                    {rowErrors[product._id] && (
                      <div
                        className="flex items-center gap-2 mx-6 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 animate-fade-in"
                        role="alert"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{rowErrors[product._id]}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setRowErrors((prev) => ({ ...prev, [product._id]: "" }))
                          }
                          className="ml-auto hover:text-red-900 transition-colors"
                          aria-label="Dismiss error"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
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
