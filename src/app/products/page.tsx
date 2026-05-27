/**
 * Products Catalog Page
 *
 * Server Component shell that renders the page metadata and layout.
 * All interactivity (fetch, filter state, modal state) lives in the
 * CatalogClient Client Component below.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */

import type { Metadata } from "next";
import CatalogClient from "./CatalogClient";

export const metadata: Metadata = {
  title: "Jewelry Catalog — JewelTry",
  description:
    "Browse our collection of jewelry and try any piece on virtually using AI-powered technology.",
};

export default function ProductsPage() {
  return <CatalogClient />;
}
