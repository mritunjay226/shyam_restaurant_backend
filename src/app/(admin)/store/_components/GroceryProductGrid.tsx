"use client";

// ─────────────────────────────────────────────────────────────────────────────
// GroceryProductGrid.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { motion, AnimatePresence } from "framer-motion";
import { Plus, AlertTriangle, Search } from "lucide-react";
import { type GroceryProduct, type CartItem } from "./GroceryPOS";

interface GroceryProductGridProps {
  products: GroceryProduct[];
  cart: CartItem[];
  onAdd: (product: GroceryProduct) => void;
  search: string;
}

export function GroceryProductGrid({ products, cart, onAdd, search }: GroceryProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="w-16 h-16 bg-[#F7F6F3] rounded-2xl flex items-center justify-center mb-4 border border-[#E8E5DF]">
          <Search size={22} className="text-gray-300" />
        </div>
        <h3 className="font-bold text-gray-700 text-sm">
          {search ? `No results for "${search}"` : "No products in this category"}
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          {search ? "Try a different search term" : "Add products from the inventory panel"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 scrollbar-hide">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        <AnimatePresence mode="popLayout">
          {products.map((product) => {
            const inCart = cart.find((i) => i.product._id === product._id);
            const isLowStock = product.stockQuantity <= product.lowStockThreshold;
            const isOutOfStock = product.stockQuantity === 0;

            return (
              <motion.button
                key={product._id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => !isOutOfStock && onAdd(product)}
                disabled={isOutOfStock}
                className={`relative text-left p-4 rounded-2xl border transition-all duration-200 group focus:outline-none ${
                  isOutOfStock
                    ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-100"
                    : inCart
                    ? "bg-white border-[#2D6A4F] shadow-md shadow-[#2D6A4F]/10 ring-1 ring-[#2D6A4F]/20"
                    : "bg-white border-[#E8E5DF] hover:border-[#2D6A4F]/40 hover:shadow-md hover:shadow-black/5 active:scale-[0.98]"
                }`}
              >
                {/* In-cart qty badge */}
                {inCart && (
                  <div className="absolute top-2.5 right-2.5 w-6 h-6 bg-[#2D6A4F] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm">
                    {inCart.quantity}
                  </div>
                )}

                {/* Stock warning */}
                {isLowStock && !isOutOfStock && (
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                    <AlertTriangle size={11} className="text-amber-500" />
                  </div>
                )}

                {/* Out of stock overlay */}
                {isOutOfStock && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gray-50/80">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white px-2 py-1 rounded-lg border border-gray-100">
                      Out of Stock
                    </span>
                  </div>
                )}

                {/* Category tag */}
                <p className="text-[9px] font-black text-[#2D6A4F]/60 uppercase tracking-[0.18em] mb-2 leading-none">
                  {product.subCategory || product.category}
                </p>

                {/* Name */}
                <h4 className="font-bold text-gray-900 text-sm leading-snug mb-3 line-clamp-2 group-hover:text-[#2D6A4F] transition-colors">
                  {product.name}
                </h4>

                {/* Footer row */}
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-base font-black text-gray-900">
                      {product.stockQuantity ?? "N/A"}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold ml-1">Left</span>

                    {/* Stock level */}
                    <p className={`text-[10px] font-bold mt-0.5 ${
                      isLowStock ? "text-amber-500" : "text-gray-400"
                    }`}>
                      {product.stockQuantity} {product.unit} left
                    </p>
                  </div>

                  {/* Add button */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm ${
                    inCart
                      ? "bg-[#2D6A4F] text-white"
                      : "bg-[#F7F6F3] text-gray-400 group-hover:bg-[#2D6A4F] group-hover:text-white border border-[#E8E5DF] group-hover:border-[#2D6A4F]"
                  }`}>
                    <Plus size={14} />
                  </div>
                </div>

                {/* GST badge */}
                {product.gstRate !== undefined && product.gstRate > 0 && (
                  <div className="mt-2">
                    <span className="text-[8px] font-black bg-[#F7F6F3] border border-[#E8E5DF] text-gray-400 px-1.5 py-0.5 rounded-md tracking-wider uppercase">
                      GST {product.gstRate}%
                    </span>
                  </div>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
