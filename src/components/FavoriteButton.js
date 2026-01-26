"use client";

import { useState, useEffect, useRef } from "react";

// Favorites storage utilities
const FAVORITES_KEY = "vehndr_favorites";

function getFavorites() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  const addFavorite = (vendorId) => {
    const updated = [...new Set([...favorites, vendorId])];
    setFavorites(updated);
    saveFavorites(updated);
  };

  const removeFavorite = (vendorId) => {
    const updated = favorites.filter((id) => id !== vendorId);
    setFavorites(updated);
    saveFavorites(updated);
  };

  const toggleFavorite = (vendorId) => {
    if (favorites.includes(vendorId)) {
      removeFavorite(vendorId);
      return false;
    } else {
      addFavorite(vendorId);
      return true;
    }
  };

  const isFavorite = (vendorId) => favorites.includes(vendorId);

  return { favorites, addFavorite, removeFavorite, toggleFavorite, isFavorite };
}

// Particle burst component for dopamine effect
function ParticleBurst({ active, onComplete }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const particles = [];
    const colors = ["#FF6B6B", "#D946EF", "#F59E0B", "#8B5CF6", "#10B981"];

    // Create particles
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      particles.push({
        x: 16,
        y: 16,
        vx: Math.cos(angle) * (3 + Math.random() * 2),
        vy: Math.sin(angle) * (3 + Math.random() * 2),
        radius: 2 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.02 + Math.random() * 0.02,
      });
    }

    let animationId;
    const animate = () => {
      ctx.clearRect(0, 0, 32, 32);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // gravity
        p.alpha -= p.decay;

        if (p.alpha > 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle =
            p.color +
            Math.floor(p.alpha * 255)
              .toString(16)
              .padStart(2, "0");
          ctx.fill();
        }
      });

      if (particles.some((p) => p.alpha > 0)) {
        animationId = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };

    animate();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      width={32}
      height={32}
      className="absolute inset-0 pointer-events-none z-10"
    />
  );
}

export default function FavoriteButton({ vendorId, className = "", size = "default" }) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showBurst, setShowBurst] = useState(false);

  // Load initial state from localStorage
  useEffect(() => {
    const favorites = getFavorites();
    setIsFavorited(favorites.includes(vendorId));
  }, [vendorId]);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const favorites = getFavorites();
    const wasAlreadyFavorited = favorites.includes(vendorId);

    if (wasAlreadyFavorited) {
      // Remove from favorites
      saveFavorites(favorites.filter((id) => id !== vendorId));
      setIsFavorited(false);
    } else {
      // Add to favorites with animation
      saveFavorites([...favorites, vendorId]);
      setIsFavorited(true);
      setIsAnimating(true);
      setShowBurst(true);

      // Haptic feedback on mobile
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      setTimeout(() => setIsAnimating(false), 400);
    }
  };

  const sizeClasses = size === "large" 
    ? "w-10 h-10" 
    : size === "small" 
    ? "w-6 h-6" 
    : "w-8 h-8";

  const iconSize = size === "large" ? 20 : size === "small" ? 12 : 16;

  return (
    <button
      onClick={handleClick}
      className={`${sizeClasses} rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all shadow-sm relative overflow-visible ${className} ${
        isAnimating ? "scale-125" : "hover:scale-110 active:scale-95"
      }`}
      style={{
        transition: isAnimating 
          ? "transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)" 
          : "transform 0.2s ease",
      }}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      {/* Particle burst effect */}
      <ParticleBurst active={showBurst} onComplete={() => setShowBurst(false)} />

      {/* Ripple effect on favorite */}
      {isAnimating && (
        <span className="absolute inset-0 rounded-full bg-[var(--coral-500)] animate-ping opacity-40" />
      )}

      {/* Heart icon */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill={isFavorited ? "var(--coral-500)" : "none"}
        stroke={isFavorited ? "var(--coral-500)" : "var(--gray-700)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`relative z-20 transition-all ${isAnimating ? "scale-110" : ""}`}
        style={{
          filter: isFavorited ? "drop-shadow(0 0 4px var(--coral-500))" : "none",
        }}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
