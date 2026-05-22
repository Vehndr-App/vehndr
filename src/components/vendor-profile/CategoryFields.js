"use client";

import {
  CATEGORY_DISPLAY,
  EVENT_TYPE_META,
  EVENT_TYPES,
  VENDOR_CATEGORY_TREE,
  normalizeEventType
} from "../../constants/categories";

export default function CategoryFields({
  categories = [],
  eventTypes = [],
  onCategoriesChange,
  onEventTypesChange,
  showEventTypes = true
}) {
  const gradientStyle = (baseColor) => ({
    backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${baseColor} 75%, white), color-mix(in srgb, ${baseColor} 35%, white))`
  });

  const toggleCategory = (label) => {
    if (categories.includes(label)) {
      onCategoriesChange(categories.filter((c) => c !== label));
    } else {
      onCategoriesChange([...categories, label]);
    }
  };

  const toggleEventType = (slug) => {
    const normalized = normalizeEventType(slug);
    if (!onEventTypesChange) return;
    if (eventTypes.includes(normalized)) {
      onEventTypesChange(eventTypes.filter((t) => t !== normalized));
    } else {
      onEventTypesChange([...eventTypes, normalized]);
    }
  };

  const visibleEventTypeSlugs = EVENT_TYPES.slice(0, 14).map((eventType) => eventType.slug);
  const allVisibleEventTypesSelected =
    visibleEventTypeSlugs.length > 0 &&
    visibleEventTypeSlugs.every((slug) => eventTypes.includes(slug));

  const toggleAllVisibleEventTypes = () => {
    if (!onEventTypesChange) return;
    if (allVisibleEventTypesSelected) {
      onEventTypesChange(eventTypes.filter((slug) => !visibleEventTypeSlugs.includes(slug)));
      return;
    }
    onEventTypesChange(Array.from(new Set([...eventTypes, ...visibleEventTypeSlugs])));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {VENDOR_CATEGORY_TREE.filter((category) => !category.parent).map((parent) => {
          const children = VENDOR_CATEGORY_TREE.filter(
            (category) =>
              category.parent === parent.slug || category.groups?.includes(parent.slug)
          );
          const options = [parent, ...children];

          return (
            <div key={parent.slug}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)] mb-2">
                {parent.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {options.map((category) => (
                  (() => {
                    const isActive = categories.includes(category.label);
                    const display = CATEGORY_DISPLAY[category.label] || {};
                    return (
                      <button
                        key={category.slug}
                        type="button"
                        onClick={() => toggleCategory(category.label)}
                        className={`chip ${isActive ? "chip-active" : "chip-outlined"}`}
                        style={!isActive ? gradientStyle(display.color || "var(--gray-100)") : undefined}
                      >
                        {isActive && (
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                        )}
                        <span className="mr-1">{display.icon || "✨"}</span>
                        <span>{display.label || category.label}</span>
                      </button>
                    );
                  })()
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showEventTypes && onEventTypesChange && (
        <div className="border-t border-[var(--gray-100)] pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--gray-700)]">
              Event types you serve (optional)
            </p>
            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--gray-600)] cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-[var(--gray-300)]"
                checked={allVisibleEventTypesSelected}
                onChange={toggleAllVisibleEventTypes}
              />
              Select all
            </label>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {EVENT_TYPES.slice(0, 14).map((et) => (
              (() => {
                const isActive = eventTypes.includes(et.slug);
                const eventMeta = EVENT_TYPE_META[et.slug] || {};
                return (
                  <button
                    key={et.slug}
                    type="button"
                    onClick={() => toggleEventType(et.slug)}
                    className={`chip text-xs ${isActive ? "chip-active" : "chip-outlined"}`}
                    style={!isActive ? gradientStyle(eventMeta.color || "var(--gray-100)") : undefined}
                  >
                    <span className="mr-1">{eventMeta.icon || "🎉"}</span>
                    <span>{et.label}</span>
                  </button>
                );
              })()
            ))}
          </div>
        </div>
      )}

      {categories.length === 0 && (
        <p className="text-sm text-[var(--error)]">Select at least one category</p>
      )}
    </div>
  );
}
