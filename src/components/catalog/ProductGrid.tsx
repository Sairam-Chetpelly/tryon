/**
 * ProductGrid
 *
 * Renders a responsive CSS grid of ProductCard components.
 * While loading, displays 6 ProductSkeleton placeholders.
 * When data is available, delegates each item to ProductCard.
 *
 * Grid breakpoints:
 *   - 1 column  on mobile  (< 640 px)
 *   - 2 columns on tablet  (640–1023 px)
 *   - 3 columns on desktop (≥ 1024 px)
 *
 * Requirements: 4.2, 4.3
 */

import type { Product } from "@/types/catalog";
import ProductCard from "@/components/catalog/ProductCard";
import ProductSkeleton from "@/components/catalog/ProductSkeleton";

const SKELETON_COUNT = 6;

export interface ProductGridProps {
  products: Product[];
  onTryOn: (product: Product) => void;
  isLoading?: boolean;
}

export default function ProductGrid({
  products,
  onTryOn,
  isLoading = false,
}: ProductGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {isLoading
        ? /* Loading state — render skeleton placeholders (Requirement 4.3) */
          Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <ProductSkeleton key={i} />
          ))
        : /* Data available — render product cards (Requirement 4.2) */
          products.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              onTryOn={onTryOn}
            />
          ))}
    </div>
  );
}
