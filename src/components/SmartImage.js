"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * SmartImage component that handles HEIC/HEIF images by converting them to JPEG
 * Falls back to original src if conversion fails or isn't needed
 */
export default function SmartImage({ src, alt, className, fallbackClassName, ...props }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const convertHeicToJpeg = useCallback(async (url) => {
    try {
      // Dynamically import heic2any only when needed
      const heic2any = (await import('heic2any')).default;
      
      // Fetch the HEIC image
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      
      // Convert HEIC to JPEG
      const jpegBlob = await heic2any({
        blob,
        toType: 'image/jpeg',
        quality: 0.85
      });
      
      // Handle both single blob and array of blobs
      const resultBlob = Array.isArray(jpegBlob) ? jpegBlob[0] : jpegBlob;
      
      // Create object URL for the converted image
      const objectUrl = URL.createObjectURL(resultBlob);
      setImageSrc(objectUrl);
      setLoading(false);
    } catch (err) {
      console.warn('HEIC conversion failed, trying original:', err.message);
      // Fall back to original URL - browser might support it
      setImageSrc(src);
      setLoading(false);
    }
  }, [src]);

  useEffect(() => {
    if (!src) {
      setLoading(false);
      setError(true);
      return;
    }

    // Check if the URL suggests HEIC format
    const isHeic = src.toLowerCase().includes('.heic') || src.toLowerCase().includes('.heif');
    
    if (isHeic) {
      convertHeicToJpeg(src);
    } else {
      // For non-HEIC images, just use the src directly
      setImageSrc(src);
      setLoading(false);
    }
  }, [src, convertHeicToJpeg]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [imageSrc]);

  if (loading) {
    return (
      <div className={`${className || ''} ${fallbackClassName || 'bg-[var(--gray-200)] animate-pulse'}`} {...props}>
        <div className="w-full h-full flex items-center justify-center">
          <svg className="w-6 h-6 text-[var(--gray-400)] animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div className={`${className || ''} ${fallbackClassName || 'bg-[var(--gray-100)]'}`} {...props}>
        <div className="w-full h-full flex items-center justify-center">
          <svg className="w-8 h-8 text-[var(--gray-300)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img 
      src={imageSrc} 
      alt={alt} 
      className={className}
      onError={() => setError(true)}
      {...props} 
    />
  );
}

