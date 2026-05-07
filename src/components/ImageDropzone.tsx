"use client";

/**
 * ImageDropzone
 * Drag-and-drop + click-to-upload image input with preview.
 */

import React, { useCallback } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { Upload, X, ImageIcon, AlertCircle } from "lucide-react";
import { cn, validateImageFile, createUploadedImage, formatFileSize } from "@/lib/utils";
import { MAX_FILE_SIZE_MB } from "@/lib/constants";
import type { ImageDropzoneProps } from "@/types";
import toast from "react-hot-toast";

export default function ImageDropzone({
  label,
  sublabel,
  onImageSelected,
  currentImage,
  onClear,
  disabled = false,
  className,
}: ImageDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const error = rejectedFiles[0].errors[0]?.message ?? "Invalid file";
        toast.error(error);
        return;
      }

      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      const validation = validateImageFile(file);

      if (!validation.valid) {
        toast.error(validation.error ?? "Invalid file");
        return;
      }

      const uploadedImage = createUploadedImage(file);
      onImageSelected(uploadedImage);
    },
    [onImageSelected]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: {
        "image/jpeg": [".jpg", ".jpeg"],
        "image/png": [".png"],
        "image/webp": [".webp"],
      },
      maxFiles: 1,
      maxSize: MAX_FILE_SIZE_MB * 1024 * 1024,
      disabled,
      multiple: false,
    });

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Label */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-jewelry-primary uppercase tracking-wider">
          {label}
        </span>
        {sublabel && (
          <span className="text-xs text-gray-400">{sublabel}</span>
        )}
      </div>

      {/* Drop Zone */}
      {!currentImage ? (
        <div
          {...getRootProps()}
        className={cn(
            "relative flex flex-col items-center justify-center",
            "w-full min-h-[220px] rounded-2xl border-2 border-dashed",
            "cursor-pointer transition-all duration-300 select-none",
            "bg-jewelry-light/30",
            isDragActive && !isDragReject
              ? "border-jewelry-primary bg-gold-50 scale-[1.02] shadow-lg shadow-gold-200"
              : "border-gold-300 hover:border-jewelry-primary hover:bg-gold-50",
            isDragReject && "border-red-400 bg-red-50",
            disabled && "opacity-50 cursor-not-allowed pointer-events-none"
          )}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center gap-3 p-6 text-center">
            {isDragReject ? (
              <>
                <AlertCircle className="w-10 h-10 text-red-400" />
                <p className="text-sm font-medium text-red-500">
                  Invalid file type
                </p>
              </>
            ) : isDragActive ? (
              <>
                <div className="w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center animate-bounce">
                  <Upload className="w-6 h-6 text-jewelry-primary" />
                </div>
                <p className="text-sm font-semibold text-jewelry-primary">
                  Drop it here!
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-gold-100 flex items-center justify-center group-hover:bg-gold-200 transition-colors">
                  <ImageIcon className="w-7 h-7 text-jewelry-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    Drag & drop or{" "}
                    <span className="text-jewelry-primary underline underline-offset-2">
                      browse
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    JPG, PNG, WebP · Max {MAX_FILE_SIZE_MB}MB
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Image Preview */
        <div className="relative group rounded-2xl overflow-hidden border-2 border-gold-300 shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentImage.preview}
            alt={currentImage.name}
            className="w-full h-[220px] object-cover"
          />

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full text-sm font-medium text-gray-800 hover:bg-white transition-colors shadow-lg"
              aria-label="Remove image"
            >
              <X className="w-4 h-4" />
              Change Photo
            </button>
          </div>

          {/* File info badge */}
          <div className="absolute bottom-2 left-2 right-2">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center justify-between">
              <span className="text-white text-xs font-medium truncate max-w-[70%]">
                {currentImage.name}
              </span>
              <span className="text-gold-300 text-xs ml-2 shrink-0">
                {formatFileSize(currentImage.size)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
