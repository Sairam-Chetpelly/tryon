"use client";

/**
 * Header
 * App navigation bar with logo and history toggle.
 */

import React from "react";
import { History, Gem } from "lucide-react";

interface HeaderProps {
  onHistoryOpen: () => void;
}

export default function Header({ onHistoryOpen }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md border-b border-gold-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-jewelry-primary to-gold-600 flex items-center justify-center shadow-md">
            <Gem className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">
              JewelTry
            </h1>
            <p className="text-[10px] text-jewelry-primary font-medium tracking-wider uppercase leading-none mt-0.5">
              AI Virtual Try-On
            </p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Provider badge */}
          <span className="hidden sm:flex items-center gap-1.5 text-xs bg-gold-50 border border-gold-200 text-jewelry-secondary px-3 py-1.5 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            AI Powered
          </span>

          {/* History button */}
          <button
            onClick={onHistoryOpen}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-gold-300 hover:text-jewelry-primary hover:bg-gold-50 transition-all text-sm font-medium"
            aria-label="View try-on history"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </button>
        </div>
      </div>
    </header>
  );
}
