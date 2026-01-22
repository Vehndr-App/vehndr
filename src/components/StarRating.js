"use client";

import { useState } from "react";

export default function StarRating({
  value = 0,
  onChange,
  readonly = false,
  size = "md",
}) {
  const [hoverValue, setHoverValue] = useState(0);

  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const starSize = sizes[size] || sizes.md;
  const displayValue = hoverValue || value;

  const handleClick = (star) => {
    if (!readonly && onChange) {
      onChange(star);
    }
  };

  const handleMouseEnter = (star) => {
    if (!readonly) {
      setHoverValue(star);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverValue(0);
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          onMouseEnter={() => handleMouseEnter(star)}
          onMouseLeave={handleMouseLeave}
          disabled={readonly}
          className={`${starSize} ${
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          } transition-transform focus:outline-none`}
          aria-label={readonly ? `${star} stars` : `Rate ${star} stars`}
        >
          <svg
            viewBox="0 0 24 24"
            fill={star <= displayValue ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.5"
            className={
              star <= displayValue
                ? "text-[var(--amber-400)]"
                : "text-[var(--gray-300)]"
            }
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}
