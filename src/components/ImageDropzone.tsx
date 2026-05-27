"use client";

/**
 * ImageDropzone
 * Drag-and-drop + click-to-upload image input with preview.
 * When showCamera=true, a "Take Photo" button opens a live camera modal
 * using getUserMedia — works on both desktop (webcam) and mobile (front camera).
 */

import React, { useCallback, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDropzone, FileRejection } from "react-dropzone";
import {
  Upload, X, ImageIcon, AlertCircle, Camera,
  FlipHorizontal, ZoomIn,
} from "lucide-react";
import { cn, validateImageFile, createUploadedImage, formatFileSize } from "@/lib/utils";
import { MAX_FILE_SIZE_MB } from "@/lib/constants";
import type { ImageDropzoneProps } from "@/types";
import toast from "react-hot-toast";

// ─── Live Camera Modal ────────────────────────────────────────────────────────

interface CameraModalProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

function CameraModal({ onCapture, onClose }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<string | null>(null); // data URL preview

  // Start camera stream
  const startCamera = useCallback(async (mode: "user" | "environment") => {
    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setReady(false);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setReady(true);
        };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Camera access denied";
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (msg.includes("NotFound") || msg.includes("DevicesNotFound")) {
        setError("No camera found on this device.");
      } else {
        setError(`Could not start camera: ${msg}`);
      }
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flip camera
  const handleFlip = () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    setCaptured(null);
    startCamera(next);
  };

  // Capture a frame from the video stream
  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror the image if using front camera (matches what user sees)
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCaptured(dataUrl);
  };

  // Retake — go back to live view
  const handleRetake = () => {
    setCaptured(null);
  };

  // Use the captured photo
  const handleUse = () => {
    if (!captured) return;
    // Convert data URL → File
    const arr = captured.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] ?? "image/jpeg";
    const bstr = atob(arr[1]);
    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
    const file = new File([u8arr], `camera-photo-${Date.now()}.jpg`, { type: mime });
    onCapture(file);
    onClose();
  };

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Camera"
    >
      <div className="relative w-full max-w-lg bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/80">
          <div className="flex items-center gap-2 text-white">
            <Camera className="w-4 h-4 text-gold-300" />
            <span className="text-sm font-semibold">Take Photo</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close camera"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera view / captured preview */}
        <div className="relative bg-black aspect-[4/3] flex items-center justify-center">
          {error ? (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-sm text-red-300">{error}</p>
              <button
                onClick={() => startCamera(facingMode)}
                className="mt-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-xl transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : captured ? (
            /* Captured photo preview */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={captured}
              alt="Captured photo"
              className="w-full h-full object-contain"
            />
          ) : (
            /* Live video stream */
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "w-full h-full object-cover",
                  facingMode === "user" && "scale-x-[-1]" // mirror front camera
                )}
              />
              {!ready && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="flex flex-col items-center gap-3 text-white">
                    <div className="w-8 h-8 border-2 border-gold-300 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-300">Starting camera…</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Flip camera button (top-right of video) */}
          {!captured && !error && (
            <button
              onClick={handleFlip}
              className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
              aria-label="Flip camera"
              title="Switch front/back camera"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-4 px-4 py-5 bg-black/80">
          {!captured ? (
            /* Capture button */
            <button
              onClick={handleCapture}
              disabled={!ready || !!error}
              className={cn(
                "w-16 h-16 rounded-full border-4 border-white flex items-center justify-center transition-all",
                ready && !error
                  ? "bg-white hover:bg-gray-100 active:scale-95 shadow-lg"
                  : "bg-gray-600 border-gray-500 cursor-not-allowed opacity-50"
              )}
              aria-label="Capture photo"
            >
              <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-300" />
            </button>
          ) : (
            /* Retake / Use buttons */
            <>
              <button
                onClick={handleRetake}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
                Retake
              </button>
              <button
                onClick={handleUse}
                className="flex items-center gap-2 px-6 py-2.5 bg-jewelry-primary hover:bg-jewelry-secondary text-white text-sm font-semibold rounded-xl transition-colors shadow-md"
              >
                <Camera className="w-4 h-4" />
                Use Photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── ImageDropzone ────────────────────────────────────────────────────────────

export default function ImageDropzone({
  label,
  sublabel,
  onImageSelected,
  currentImage,
  onClear,
  disabled = false,
  className,
  showCamera = false,
}: ImageDropzoneProps) {
  const [cameraOpen, setCameraOpen] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast.error(validation.error ?? "Invalid file");
        return;
      }
      onImageSelected(createUploadedImage(file));
    },
    [onImageSelected]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        const error = rejectedFiles[0].errors[0]?.message ?? "Invalid file";
        toast.error(error);
        return;
      }
      if (acceptedFiles.length === 0) return;
      processFile(acceptedFiles[0]);
    },
    [processFile]
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
        <>
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
                  <div className="w-14 h-14 rounded-full bg-gold-100 flex items-center justify-center transition-colors">
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

          {/* Camera button */}
          {showCamera && !disabled && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCameraOpen(true);
                }}
                className={cn(
                  "w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl",
                  "border-2 border-dashed border-gold-300 bg-gold-50",
                  "text-sm font-semibold text-jewelry-secondary",
                  "hover:border-jewelry-primary hover:bg-gold-100 hover:text-jewelry-primary",
                  "transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-jewelry-primary"
                )}
              >
                <Camera className="w-5 h-5" />
                Take Photo with Camera
              </button>
            </>
          )}
        </>
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
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full text-sm font-medium text-gray-800 hover:bg-white transition-colors shadow-lg"
              aria-label="Remove image"
            >
              <X className="w-4 h-4" />
              Change Photo
            </button>

            {showCamera && (
              <button
                onClick={(e) => { e.stopPropagation(); setCameraOpen(true); }}
                disabled={disabled}
                className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full text-sm font-medium text-gray-800 hover:bg-white transition-colors shadow-lg"
                aria-label="Retake with camera"
              >
                <Camera className="w-4 h-4" />
                Retake
              </button>
            )}
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

      {/* Live camera modal */}
      {cameraOpen && (
        <CameraModal
          onCapture={(file) => processFile(file)}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}
