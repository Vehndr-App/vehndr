"use client";

import { useEffect, useState } from "react";

export function useScrollSnapIndex(scrollRef, count) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || count <= 0) return;

    const onScroll = () => {
      const slideWidth = el.offsetWidth;
      if (slideWidth <= 0) return;
      const next = Math.min(Math.round(el.scrollLeft / slideWidth), count - 1);
      setIndex(next);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef, count]);

  const scrollToIndex = (nextIndex) => {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(nextIndex, count - 1));
    el.scrollTo({ left: clamped * el.offsetWidth, behavior: "smooth" });
    setIndex(clamped);
  };

  return { index, setIndex, scrollToIndex };
}
