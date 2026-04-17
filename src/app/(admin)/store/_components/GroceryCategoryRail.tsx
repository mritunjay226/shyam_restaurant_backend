"use client";

// ─────────────────────────────────────────────────────────────────────────────
// GroceryCategoryRail.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { Search, X } from "lucide-react";

// Category emoji map — fallback to 🛒
const CAT_EMOJI: Record<string, string> = {
  Dairy: "🥛",
  Grains: "🌾",
  Beverages: "🧃",
  Snacks: "🍿",
  Fruits: "🍎",
  Vegetables: "🥦",
  Bakery: "🍞",
  Meat: "🥩",
  Frozen: "🧊",
  Spices: "🌶️",
  Oils: "🫙",
  Pulses: "🫘",
  Cleaning: "🧹",
  Personal: "🧴",
  Sweets: "🍬",
};

interface GroceryCategoryRailProps {
  categories: { id: string; name: string }[];
  activeCategory: string;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
}

export function GroceryCategoryRail({
  categories,
  activeCategory,
  onSelect,
  search,
  onSearchChange,
}: GroceryCategoryRailProps) {
  return (
    <div className="bg-white border-b border-[#E8E5DF] shrink-0">
      {/* Search bar */}
      <div className="px-4 sm:px-5 pt-4 pb-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or scan barcode…"
            className="w-full h-9 pl-9 pr-8 bg-[#F7F6F3] border border-[#E8E5DF] rounded-xl text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#2D6A4F]/20 focus:border-[#2D6A4F]/50 transition-all"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Category pills */}
      {!search && (
        <div className="flex gap-2 px-4 sm:px-5 pb-3 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => {
            const emoji = CAT_EMOJI[cat.name] ?? "🛒";
            const isActive = cat.id === activeCategory;
            return (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                  isActive
                    ? "bg-[#2D6A4F] border-[#2D6A4F] text-white shadow-sm shadow-[#2D6A4F]/25"
                    : "bg-[#F7F6F3] border-[#E8E5DF] text-gray-500 hover:border-gray-300 hover:text-gray-800"
                }`}
              >
                <span>{emoji}</span>
                {cat.name}
              </button>
            );
          })}
        </div>
      )}

      {search && (
        <div className="px-5 pb-3">
          <p className="text-[11px] font-bold text-gray-400">
            Showing results for{" "}
            <span className="text-gray-700">&ldquo;{search}&rdquo;</span>
          </p>
        </div>
      )}
    </div>
  );
}
