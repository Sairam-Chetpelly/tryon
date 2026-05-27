/**
 * CategoryFilterBar
 *
 * Renders an "All" pill plus one pill per JewelryCategory from JEWELRY_CATEGORIES.
 * The active pill is highlighted with bg-jewelry-primary text-white; inactive pills
 * show hover styles consistent with the gold/jewelry Tailwind theme.
 *
 * Requirements: 4.6, 4.7
 */

"use client";

import type { JewelryCategory } from "@/types";
import { JEWELRY_CATEGORIES } from "@/lib/constants";

export interface CategoryFilterBarProps {
  selected: JewelryCategory | "all";
  onChange: (category: JewelryCategory | "all") => void;
}

export default function CategoryFilterBar({
  selected,
  onChange,
}: CategoryFilterBarProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Filter by category"
    >
      {/* "All" pill */}
      <button
        type="button"
        onClick={() => onChange("all")}
        aria-pressed={selected === "all"}
        className={[
          "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-jewelry-primary focus-visible:ring-offset-1",
          selected === "all"
            ? "bg-jewelry-primary text-white shadow-sm"
            : "bg-white border border-gold-200 text-gray-600 hover:border-jewelry-primary hover:text-jewelry-primary hover:bg-jewelry-light",
        ].join(" ")}
      >
        All
      </button>

      {/* One pill per JewelryCategory */}
      {JEWELRY_CATEGORIES.map(({ value, label, icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={selected === value}
          className={[
            "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-jewelry-primary focus-visible:ring-offset-1",
            selected === value
              ? "bg-jewelry-primary text-white shadow-sm"
              : "bg-white border border-gold-200 text-gray-600 hover:border-jewelry-primary hover:text-jewelry-primary hover:bg-jewelry-light",
          ].join(" ")}
        >
          <span aria-hidden="true" className="mr-1">
            {icon}
          </span>
          {label}
        </button>
      ))}
    </div>
  );
}
