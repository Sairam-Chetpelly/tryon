"use client";

/**
 * CategorySelector
 * Grid of jewelry category buttons with icons.
 */

import React from "react";
import { cn } from "@/lib/utils";
import { JEWELRY_CATEGORIES } from "@/lib/constants";
import type { CategorySelectorProps } from "@/types";

export default function CategorySelector({
  selected,
  onChange,
  disabled = false,
}: CategorySelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-semibold text-jewelry-primary uppercase tracking-wider">
        Jewelry Type
      </span>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-4 md:grid-cols-8">
        {JEWELRY_CATEGORIES.map((cat) => {
          const isSelected = selected === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => onChange(cat.value)}
              disabled={disabled}
              title={cat.description}
              aria-pressed={isSelected}
              className={cn(
                "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all duration-200",
                "text-center cursor-pointer select-none",
                isSelected
                  ? "border-jewelry-primary bg-gold-50 shadow-md shadow-gold-200 scale-105"
                  : "border-gray-200 bg-white hover:border-gold-300 hover:bg-gold-50",
                disabled && "opacity-50 cursor-not-allowed pointer-events-none"
              )}
            >
              <span className="text-xl leading-none" role="img" aria-label={cat.label}>
                {cat.icon}
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold leading-tight",
                  isSelected ? "text-jewelry-secondary" : "text-gray-500"
                )}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
