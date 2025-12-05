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
    <form onSubmit={handleSearch} className="mb-6">
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendors by name or description..."
          className="w-full rounded-xl border-2 border-[#01DBE0]/30 bg-white px-5 py-3 pr-24 text-sm font-body focus:border-[#01DBE0] focus:outline-none focus:ring-2 focus:ring-[#01DBE0]/20 transition-all"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
          {search && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            className="rounded-lg bg-gradient-to-r from-[#01DBE0] to-[#FD237A] px-4 py-1 text-xs font-semibold text-white shadow-lg shadow-[#FD237A]/30 hover:shadow-xl hover:shadow-[#FD237A]/40 transition-all"
          >
            Search
          </button>
        </div>
      </div>
    </form>
  );
}
