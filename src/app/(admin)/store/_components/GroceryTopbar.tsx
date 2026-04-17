"use client";

// ─────────────────────────────────────────────────────────────────────────────
// GroceryTopbar.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { ShoppingBasket, BarChart2, Package, Plus, AlertTriangle } from "lucide-react";
import { type ActiveView } from "./GroceryPOS";

interface GroceryTopbarProps {
  activeView: ActiveView;
  onViewChange: (v: ActiveView) => void;
  lowStockCount: number;
  onAddProduct: () => void;
}

const NAV: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
  { id: "pos", label: "Store", icon: <ShoppingBasket size={15} /> },
  { id: "sales", label: "Sales", icon: <BarChart2 size={15} /> },
  { id: "inventory", label: "Inventory", icon: <Package size={15} /> },
];

export function GroceryTopbar({
  activeView,
  onViewChange,
  lowStockCount,
  onAddProduct,
}: GroceryTopbarProps) {
  return (
    <header className="flex items-center justify-between px-4 sm:px-6 h-14 bg-white border-b border-[#E8E5DF] shrink-0 z-10">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-[#2D6A4F] rounded-xl flex items-center justify-center shadow-sm shadow-[#2D6A4F]/30">
          <ShoppingBasket size={16} className="text-white" />
        </div>
        <div className="hidden sm:block">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] leading-none">Grocery</p>
          <h1 className="text-sm font-black text-gray-900 leading-tight">Store POS</h1>
        </div>
      </div>

      {/* Center nav */}
      <nav className="flex items-center gap-1 bg-[#F7F6F3] p-1 rounded-xl border border-[#E8E5DF]">
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => onViewChange(n.id)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeView === n.id
                ? "bg-white text-gray-900 shadow-sm border border-[#E8E5DF]"
                : "text-gray-400 hover:text-gray-700"
            }`}
          >
            {n.icon}
            <span className="hidden sm:inline">{n.label}</span>
          </button>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {lowStockCount > 0 && (
          <button
            onClick={() => onViewChange("inventory")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <AlertTriangle size={12} />
            <span className="hidden sm:inline">{lowStockCount} Low</span>
            <span className="sm:hidden">{lowStockCount}</span>
          </button>
        )}
        <button
          onClick={onAddProduct}
          className="flex items-center gap-1.5 h-8 px-3 bg-[#2D6A4F] text-white rounded-xl text-xs font-bold hover:bg-[#1B4332] transition-colors shadow-sm shadow-[#2D6A4F]/20"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Add Product</span>
        </button>
      </div>
    </header>
  );
}
