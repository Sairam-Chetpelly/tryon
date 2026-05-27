import type { JewelryCategory } from "@/types";
import type { ObjectId } from "mongodb";

/**
 * Product as returned by the API (MongoDB _id serialized to string).
 */
export interface Product {
  _id: string;           // MongoDB ObjectId serialized to string
  name: string;          // Required
  description: string;   // Optional, defaults to ""
  price: number;         // Required, >= 0
  category: JewelryCategory; // Required
  imageUrl: string;      // Required — S3 public URL
  thumbnailUrl?: string; // Optional — smaller S3 URL
  inStock: boolean;      // Default: true
  createdAt: string;     // ISO 8601 string (serialized from Date)
  updatedAt: string;     // ISO 8601 string (serialized from Date)
}

/**
 * Shape used when creating a new product (no _id, no timestamps).
 */
export interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  category: JewelryCategory;
  imageUrl: string;
  thumbnailUrl?: string;
  inStock?: boolean;
}

/**
 * Shape used when updating a product (all fields optional).
 */
export type UpdateProductInput = Partial<Omit<CreateProductInput, "imageUrl">> & {
  imageUrl?: string;
};

/**
 * MongoDB document shape (stored in the products collection).
 * _id is ObjectId; timestamps are native Date objects.
 */
export interface ProductDocument {
  _id?: ObjectId;
  name: string;
  description: string;
  price: number;
  category: JewelryCategory;
  imageUrl: string;
  thumbnailUrl?: string;
  inStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Converts a MongoDB ProductDocument to the API-facing Product type.
 * Stringifies the ObjectId and converts Date fields to ISO 8601 strings.
 */
export function serializeProduct(doc: ProductDocument): Product {
  return {
    ...doc,
    _id: doc._id!.toString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
