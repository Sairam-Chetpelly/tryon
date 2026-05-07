"use client";

/**
 * Home Page
 * Main landing page with the jewelry try-on interface.
 */

import React, { useState } from "react";
import { Gem, Sparkles, Shield, Zap } from "lucide-react";
import Header from "@/components/Header";
import TryOnForm from "@/components/TryOnForm";
import HistoryPanel from "@/components/HistoryPanel";

export default function HomePage() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <Header onHistoryOpen={() => setIsHistoryOpen(true)} />

      {/* History Drawer */}
      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-jewelry-dark via-gray-900 to-gray-800 text-white py-16 px-4">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-jewelry-primary/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-gold-400/10 blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-gold-300" />
            <span className="text-gold-200">AI-Powered Virtual Try-On</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 leading-tight">
            Try Any Jewelry{" "}
            <span className="text-gold-shimmer">Instantly</span>
          </h1>

          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
            Upload your photo and any jewelry image. Our AI places it on you
            realistically — no fitting room needed.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: Zap, text: "Results in seconds" },
              { icon: Gem, text: "All jewelry types" },
              { icon: Shield, text: "Private & secure" },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm text-gray-200 border border-white/10"
              >
                <Icon className="w-3.5 h-3.5 text-gold-300" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 py-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Start Your Try-On
            </h2>
            <p className="text-gray-500 text-sm">
              Upload both images below, select the jewelry type, and hit
              Generate.
            </p>
          </div>

          {/* Card wrapper */}
          <div className="bg-white rounded-3xl shadow-xl border border-gold-100 p-6 sm:p-8">
            <TryOnForm />
          </div>
        </div>
      </main>

      {/* How It Works */}
      <section className="py-16 px-4 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-10">
            How It Works
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: "📸",
                title: "Upload Your Photo",
                desc: "Use a clear front-facing photo with good lighting for best results.",
              },
              {
                step: "02",
                icon: "💎",
                title: "Choose Jewelry",
                desc: "Upload any jewelry image and select its category (necklace, ring, etc.).",
              },
              {
                step: "03",
                icon: "✨",
                title: "Get Your Look",
                desc: "AI places the jewelry on your photo with realistic lighting and shadows.",
              },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center gap-3">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gold-50 border-2 border-gold-200 flex items-center justify-center text-3xl shadow-sm">
                    {icon}
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-jewelry-primary text-white text-xs font-bold flex items-center justify-center">
                    {step.slice(1)}
                  </span>
                </div>
                <h3 className="font-bold text-gray-800">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 bg-jewelry-dark text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Gem className="w-4 h-4 text-gold-400" />
          <span className="text-gold-300 font-semibold text-sm">JewelTry</span>
        </div>
        <p className="text-gray-500 text-xs">
          AI Jewelry Virtual Try-On · Built with Next.js & Tailwind CSS
        </p>
      </footer>
    </div>
  );
}
