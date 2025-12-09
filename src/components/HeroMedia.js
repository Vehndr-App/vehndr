"use client";

import { useState, useEffect, useRef } from "react";

/**
 * HeroMedia component for displaying video or image backgrounds
 * 
 * To use:
 * 1. Place your video at /public/hero-video.mp4 (or custom path)
 * 2. Place your fallback image at /public/hero-image.jpg (or custom path)
 * 
 * The component will:
 * - Try to load video first (if videoSrc provided)
 * - Fall back to image (if imageSrc provided)
 * - Show gradient if neither loads
 */
export default function HeroMedia({ 
  videoSrc = "/hero-video.mp4", 
  imageSrc = "/hero-image.jpg",
  overlayOpacity = 0.4 
}) {
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaType, setMediaType] = useState(null); // 'video' | 'image' | null
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    // Try to load video first
    if (videoSrc) {
      const video = document.createElement("video");
      video.src = videoSrc;
      video.oncanplaythrough = () => {
        setMediaType("video");
        setMediaLoaded(true);
      };
      video.onerror = () => {
        // Video failed, try image
        tryLoadImage();
      };
      // Timeout for slow loading
      setTimeout(() => {
        if (!mediaLoaded) {
          tryLoadImage();
        }
      }, 3000);
    } else {
      tryLoadImage();
    }

    function tryLoadImage() {
      if (imageSrc) {
        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
          setMediaType("image");
          setMediaLoaded(true);
        };
        img.onerror = () => {
          setMediaType(null);
          setMediaLoaded(true);
        };
      } else {
        setMediaType(null);
        setMediaLoaded(true);
      }
    }
  }, [videoSrc, imageSrc, mediaLoaded]);

  // Handle video playback
  useEffect(() => {
    if (mediaType === "video" && videoRef.current) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Autoplay blocked, show play button or fallback
        setIsPlaying(false);
      });
    }
  }, [mediaType]);

  if (!mediaLoaded) {
    return null; // Let the gradient show through
  }

  if (mediaType === "video") {
    return (
      <>
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: overlayOpacity + 0.3 }}
        >
          <source src={videoSrc} type="video/mp4" />
          <source src={videoSrc.replace('.mp4', '.webm')} type="video/webm" />
        </video>
        {/* Dark overlay for text readability */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-[var(--violet-900)]/60 via-[var(--magenta-900)]/50 to-[var(--coral-900)]/40"
        />
      </>
    );
  }

  if (mediaType === "image") {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: overlayOpacity + 0.3 }}
        />
        {/* Dark overlay for text readability */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-[var(--violet-900)]/60 via-[var(--magenta-900)]/50 to-[var(--coral-900)]/40"
        />
      </>
    );
  }

  // No media loaded - gradient shows through from parent
  return null;
}

