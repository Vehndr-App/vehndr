"use client";

import { useRef, useState } from "react";
import SmartImage from "../SmartImage";
import {
  resizeImage,
  validateFileSize,
  validateFileType
} from "../../utils/imageResize";

export default function PhotoUploadField({
  label,
  hint,
  imageUrl,
  onFileSelect,
  aspect = "square",
  variant = "default"
}) {
  const inputRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    setError(null);

    const typeCheck = validateFileType(file);
    if (!typeCheck.valid) {
      setError(typeCheck.message || "Please upload a JPEG, PNG, GIF, or WebP image.");
      return;
    }
    const sizeCheck = validateFileSize(file);
    if (!sizeCheck.valid) {
      setError(sizeCheck.message || "Image is too large. Please choose a smaller file.");
      return;
    }

    setProcessing(true);
    try {
      const resized = await resizeImage(file, { maxWidth: 1920, maxHeight: 1920, quality: 0.85 });
      onFileSelect(resized);
    } catch (err) {
      setError(err.message || "Failed to process image");
    } finally {
      setProcessing(false);
    }
  };

  const isOnboarding = variant === "onboarding";
  const aspectClass =
    aspect === "cover" ? "aspect-[21/9]" : aspect === "circle" ? "aspect-square rounded-full" : "aspect-square rounded-[var(--radius-xl)]";

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-[var(--gray-700)]">{label}</label>
      )}
      {hint && <p className="text-sm text-[var(--gray-500)]">{hint}</p>}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={processing}
        className={`relative w-full overflow-hidden border-2 border-dashed border-[var(--gray-200)] hover:border-[var(--violet-400)] bg-[var(--gray-50)] transition-colors ${aspectClass} ${
          isOnboarding ? "max-w-xs mx-auto" : ""
        }`}
      >
        {imageUrl ? (
          <SmartImage src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--gray-500)] p-4">
            <svg className="w-10 h-10 mb-2 text-[var(--violet-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium">
              {processing ? "Processing…" : "Tap to upload"}
            </span>
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {error && <p className="text-sm text-[var(--error)] text-center">{error}</p>}
    </div>
  );
}
