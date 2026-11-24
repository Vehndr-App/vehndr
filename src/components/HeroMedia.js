"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Hero background: prefers looping muted video, falls back to image, then solid.
 */
export default function HeroMedia({
  videoSrc = "/hero-video.mp4",
  imageSrc = "/hero-image.jpg",
  overlayOpacity = 0.4,
}) {
  const [mediaType, setMediaType] = useState(null); // 'video' | 'image' | null
  const [ready, setReady] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId;

    async function resolveMedia() {
      if (videoSrc) {
        const ok = await canPlayVideo(videoSrc);
        if (cancelled) return;
        if (ok) {
          setMediaType("video");
          setReady(true);
          return;
        }
      }

      if (imageSrc) {
        const ok = await canLoadImage(imageSrc);
        if (cancelled) return;
        if (ok) {
          setMediaType("image");
          setReady(true);
          return;
        }
      }

      if (!cancelled) {
        setMediaType(null);
        setReady(true);
      }
    }

    // Don't wait forever on slow networks
    timeoutId = setTimeout(() => {
      if (!cancelled) {
        setReady((already) => {
          if (already) return already;
          // Soft fallback: try image if video is still pending
          setMediaType((current) => current || (imageSrc ? "image" : null));
          return true;
        });
      }
    }, 8000);

    resolveMedia();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [videoSrc, imageSrc]);

  useEffect(() => {
    const el = videoRef.current;
    if (mediaType !== "video" || !el) return;

    const tryPlay = () => {
      el.play().catch(() => {
        // Autoplay may be blocked until user interaction; muted+playsInline usually works.
      });
    };

    tryPlay();
    el.addEventListener("canplay", tryPlay);
    // If loop ever fails to restart on some browsers, kick it again
    const onEnded = () => {
      el.currentTime = 0;
      tryPlay();
    };
    el.addEventListener("ended", onEnded);

    return () => {
      el.removeEventListener("canplay", tryPlay);
      el.removeEventListener("ended", onEnded);
    };
  }, [mediaType]);

  if (!ready) {
    return null;
  }

  const overlayStyle = {
    background:
      "linear-gradient(to bottom, rgba(20,16,14,0.45) 0%, rgba(20,16,14,0.35) 45%, rgba(20,16,14,0.55) 100%)",
    opacity: Math.min(Math.max(overlayOpacity + 0.35, 0.4), 0.85),
  };

  if (mediaType === "video") {
    return (
      <>
        <video
          ref={videoRef}
          key={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
        <div className="absolute inset-0" style={overlayStyle} />
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
        />
        <div className="absolute inset-0" style={overlayStyle} />
      </>
    );
  }

  return null;
}

function canPlayVideo(src) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const done = (ok) => {
      cleanup();
      resolve(ok);
    };
    const cleanup = () => {
      video.oncanplaythrough = null;
      video.onloadeddata = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
    };

    video.oncanplaythrough = () => done(true);
    video.onloadeddata = () => done(true);
    video.onerror = () => done(false);
    video.src = src;
    video.load();

    setTimeout(() => done(false), 6000);
  });
}

function canLoadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}
