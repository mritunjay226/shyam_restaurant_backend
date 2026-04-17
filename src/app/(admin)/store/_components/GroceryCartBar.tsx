"use client";

// ─────────────────────────────────────────────────────────────────────────────
// GroceryCartBar.tsx — mobile floating cart bar (hidden on lg+)
// ─────────────────────────────────────────────────────────────────────────────

import { motion } from "framer-motion";
import { ShoppingCart, ArrowRight } from "lucide-react";

interface GroceryCartBarProps {
  totalItems: number;
  subtotal: number;
  onOpen: () => void;
}

export function GroceryCartBar({ totalItems, subtotal, onOpen }: GroceryCartBarProps) {
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 350 }}
      className="fixed bottom-4 left-4 right-4 z-40 lg:hidden"
    >
      <button
        onClick={onOpen}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#1B4332] rounded-2xl shadow-2xl shadow-black/30 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
            <ShoppingCart size={16} className="text-white" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#52B788] text-[#1B4332] text-[9px] font-black rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          </div>
          <div>
            <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest leading-none mb-0.5">
              {totalItems} item{totalItems !== 1 ? "s" : ""}
            </p>
            <p className="text-base font-black text-white leading-none">
              ₹{subtotal.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#52B788] text-[#1B4332] px-4 py-2 rounded-xl font-black text-xs">
          Checkout
          <ArrowRight size={13} />
        </div>
      </button>
    </motion.div>
  );
}
