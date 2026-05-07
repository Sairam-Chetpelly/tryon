"use client";

/**
 * ProcessingOverlay
 * Full-screen loading overlay shown while AI is processing the try-on.
 */

import React, { useEffect, useState } from "react";
import { PROCESSING_MESSAGES } from "@/lib/constants";

export default function ProcessingOverlay() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Cycle through processing messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % PROCESSING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Animate progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev; // Hold at 90% until done
        return prev + Math.random() * 8;
      });
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label="Processing your jewelry try-on"
    >
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center animate-slide-up">
        {/* Animated Jewelry Icon */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-gold-200 animate-spin [animation-duration:3s]" />
          {/* Inner ring */}
          <div className="absolute inset-2 rounded-full border-4 border-t-jewelry-primary border-r-transparent border-b-transparent border-l-transparent animate-spin [animation-duration:1.5s]" />
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl animate-pulse-gold">💎</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          AI is Working its Magic
        </h3>

        {/* Cycling message */}
        <p
          key={messageIndex}
          className="text-sm text-gray-500 mb-6 animate-fade-in min-h-[20px]"
        >
          {PROCESSING_MESSAGES[messageIndex]}
        </p>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-jewelry-primary to-gold-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.min(progress, 90)}%` }}
          />
        </div>

        <p className="text-xs text-gray-400 mt-3">
          This may take 10–30 seconds
        </p>
      </div>
    </div>
  );
}
