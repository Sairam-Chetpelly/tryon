/**
 * ProductSkeleton
 *
 * Animated loading placeholder that matches the dimensions of ProductCard.
 * Renders an image area, name line, price line, and button skeleton.
 * No props — used as a drop-in loading placeholder in ProductGrid.
 *
 * Requirements: 4.3
 */
export default function ProductSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gold-100 overflow-hidden shadow-sm">
      {/* Image area skeleton */}
      <div className="relative w-full aspect-square bg-gold-50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gold-50 via-gold-100 to-gold-50 animate-shimmer bg-[length:200%_100%]" />
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">
        {/* Category badge skeleton */}
        <div className="h-5 w-20 rounded-full bg-gold-100 animate-pulse" />

        {/* Product name skeleton */}
        <div className="space-y-1.5">
          <div className="h-4 w-3/4 rounded bg-gold-100 animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-gold-100 animate-pulse" />
        </div>

        {/* Price skeleton */}
        <div className="h-5 w-24 rounded bg-gold-100 animate-pulse" />

        {/* Try On button skeleton */}
        <div className="h-10 w-full rounded-xl bg-gold-100 animate-pulse mt-1" />
      </div>
    </div>
  );
}
