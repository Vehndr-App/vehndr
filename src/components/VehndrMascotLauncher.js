"use client";

import { useEffect, useState } from "react";
import { MASCOT_ANIMATIONS, MASCOT_SPEECH } from "../constants/mascot";

/**
 * Floating Vehndr mascot launcher — uses the imported artwork as-is
 * (no recolor, crop, or enclosing circle/box).
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onToggle
 * @param {() => void} [props.onSettle] - dismiss bubble + freeze animation (keep mascot)
 * @param {boolean} [props.settled] - quiet mode: still image, no bubble
 * @param {'idle'|'welcome'|'thinking'|'responding'} [props.mood]
 * @param {string} [props.className]
 */
export default function VehndrMascotLauncher({
  isOpen,
  onToggle,
  onSettle,
  settled = false,
  mood = "idle",
  className = "",
}) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [animatedSrc, setAnimatedSrc] = useState(MASCOT_ANIMATIONS.idle);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(!!mq.matches);
    sync();
    if (mq.addEventListener) {
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }
    mq.addListener(sync);
    return () => mq.removeListener(sync);
  }, []);

  // Use mood GIF when available; otherwise stay on idle animation
  useEffect(() => {
    const preferred = MASCOT_ANIMATIONS[mood] || MASCOT_ANIMATIONS.idle;
    if (mood === "idle" || preferred === MASCOT_ANIMATIONS.idle) {
      setAnimatedSrc(MASCOT_ANIMATIONS.idle);
      return undefined;
    }
    let cancelled = false;
    const probe = new window.Image();
    probe.onload = () => {
      if (!cancelled) setAnimatedSrc(preferred);
    };
    probe.onerror = () => {
      if (!cancelled) setAnimatedSrc(MASCOT_ANIMATIONS.idle);
    };
    probe.src = preferred;
    return () => {
      cancelled = true;
    };
  }, [mood]);

  const useStill = settled || reduceMotion;
  const src = useStill ? MASCOT_ANIMATIONS.idleStill : animatedSrc;
  const showBubble = !isOpen && !settled && !reduceMotion;

  return (
    <div
      className={`fixed bottom-20 right-3 sm:right-4 z-[60] flex flex-col items-end gap-1 ${className}`}
    >
      {showBubble && (
        <div
          className={`relative max-w-[168px] mr-1 rounded-2xl rounded-br-md bg-white pl-3 pr-8 py-2 text-xs font-semibold text-[var(--gray-800)] shadow-lg border border-[var(--gray-100)] mascot-bubble-enter`}
          role="status"
        >
          {MASCOT_SPEECH.idle}
          {onSettle && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSettle();
              }}
              className="absolute top-1 right-1 w-5 h-5 rounded-full text-[var(--gray-400)] hover:text-[var(--gray-700)] hover:bg-[var(--gray-100)] flex items-center justify-center transition-colors"
              aria-label="Dismiss greeting"
              title="Dismiss"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          <span
            className="absolute -bottom-1.5 right-4 w-3 h-3 bg-white border-r border-b border-[var(--gray-100)] rotate-45"
            aria-hidden
          />
        </div>
      )}

      <button
        type="button"
        onClick={onToggle}
        className={`group relative bg-transparent border-0 p-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--violet-500)] focus-visible:ring-offset-2 rounded-lg ${
          reduceMotion ? "" : "transition-transform duration-200 hover:scale-110 active:scale-95"
        }`}
        aria-label={isOpen ? "Close chat" : "Open Event Bestie"}
        aria-expanded={isOpen}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- GIF/PNG artwork must stay as native img */}
        <img
          src={src}
          alt=""
          width={130}
          height={130}
          draggable={false}
          className="block w-[95px] h-[95px] sm:w-[130px] sm:h-[130px] object-contain select-none pointer-events-none bg-transparent"
        />
        {isOpen && (
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[var(--gray-900)] text-white flex items-center justify-center shadow-md">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </span>
        )}
      </button>
    </div>
  );
}
