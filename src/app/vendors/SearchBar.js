"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar({ initialSearch, category }) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);

    const queryString = params.toString();
    router.push(`/vendors${queryString ? `?${queryString}` : ""}`);
  };

  const handleClear = () => {
    setSearch("");
    const params = new URLSearchParams();
    if (category) params.set("category", category);

    const queryString = params.toString();
    router.push(`/vendors${queryString ? `?${queryString}` : ""}`);
  };

  return (
    <form onSubmit={handleSearch}>
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gray-400)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendors by name or description..."
          className="input input-search pl-12 pr-28"
        />
        
        {/* Action Buttons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {search && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 text-[var(--gray-400)] hover:text-[var(--gray-600)] transition-colors rounded-full hover:bg-[var(--gray-100)]"
              aria-label="Clear search"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
          <button
            type="submit"
            className="btn bg-gradient-primary text-white text-sm font-semibold h-9 px-4 rounded-[var(--radius-lg)]"
          >
            Search
          </button>
        </div>
      </div>
    </form>
  );
}
