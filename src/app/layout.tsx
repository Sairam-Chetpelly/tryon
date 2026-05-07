import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "JewelTry — AI Jewelry Virtual Try-On",
  description:
    "Upload your photo and any jewelry image to see how it looks on you instantly using AI-powered virtual try-on technology.",
  keywords: [
    "jewelry try-on",
    "virtual try-on",
    "AI jewelry",
    "necklace try-on",
    "ring try-on",
    "earrings try-on",
  ],
  authors: [{ name: "JewelTry" }],
  openGraph: {
    title: "JewelTry — AI Jewelry Virtual Try-On",
    description: "See how any jewelry looks on you before you buy.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#c9a84c",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-jewelry-light">
        {children}

        {/* Global toast notifications */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1a1208",
              color: "#fdf8ee",
              borderRadius: "12px",
              border: "1px solid #c9a84c",
              fontSize: "14px",
              fontWeight: "500",
            },
            success: {
              iconTheme: {
                primary: "#c9a84c",
                secondary: "#1a1208",
              },
            },
            error: {
              iconTheme: {
                primary: "#ef4444",
                secondary: "#fff",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
