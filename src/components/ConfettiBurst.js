"use client";

import { useEffect, useMemo, useState } from "react";

const CONFETTI_COLORS = [
  "var(--violet-500)",
  "var(--magenta-500)",
  "var(--violet-300)",
  "var(--magenta-300)",
  "var(--violet-700)"
];

const buildConfettiPieces = (count) =>
  Array.from({ length: count }, (_, index) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.25;
    const duration = 0.9 + Math.random() * 0.6;
    const size = 6 + Math.random() * 6;
    const drift = (Math.random() * 2 - 1) * 60;
    const rotate = Math.floor(Math.random() * 360);

    return {
      id: index,
      left,
      delay,
      duration,
      size,
      drift,
      rotate,
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length]
    };
  });

export default function ConfettiBurst({ active, pieceCount = 28, duration = 1200 }) {
  const [isVisible, setIsVisible] = useState(false);
  const pieces = useMemo(() => buildConfettiPieces(pieceCount), [pieceCount]);

  useEffect(() => {
    if (!active) return undefined;

    setIsVisible(true);
    const timer = setTimeout(() => setIsVisible(false), duration);

    return () => clearTimeout(timer);
  }, [active, duration]);

  if (!isVisible) return null;

  return (
    <div className="confetti-burst" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${piece.size * 1.4}px`,
            background: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            "--confetti-drift": `${piece.drift}px`,
            "--confetti-rotate": `${piece.rotate}deg`
          }}
        />
      ))}
    </div>
  );
}
