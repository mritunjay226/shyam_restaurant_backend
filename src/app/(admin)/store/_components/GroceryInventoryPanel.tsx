"use client";

// ─────────────────────────────────────────────────────────────────────────────
// GroceryInventoryPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { AlertTriangle, Package, Search, ArrowUp, ArrowDown, Edit3, Check, X } from "lucide-react";
import { type GroceryProduct } from "./GroceryPOS";
import { toast } from "sonner";
import { GroceryBulkStockInModal } from "./GroceryBulkStockInModal";
import { AnimatePresence } from "framer-motion";

interface GroceryInventoryPanelProps {
  products: GroceryProduct[];
  lowStockProducts: GroceryProduct[];
}

type StockEditState = {
  productId: string;
  value: string;
  mode: "set" | "add" | "remove";
};

export function GroceryInventoryPanel({ products, lowStockProducts }: GroceryInventoryPanelProps) {
  const [search, setSearch] = useState("");
  const [filterLow, setFilterLow] = useState(false);
  const [editState, setEditState] = useState<StockEditState | null>(null);
  const [editPriceId, setEditPriceId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [isStockInOpen, setIsStockInOpen] = useState(false);

  const adjustStock = useMutation(api.grocery.adjustGroceryStock);
  const updateProduct = useMutation(api.grocery.updateGroceryProduct);

  const filteredProducts = products
    .filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchLow = !filterLow || p.stockQuantity <= p.lowStockThreshold;
      return matchSearch && matchLow;
    })
    .sort((a, b) => {
      // Low stock first
      const aLow = a.stockQuantity <= a.lowStockThreshold;
      const bLow = b.stockQuantity <= b.lowStockThreshold;
      if (aLow && !bLow) return -1;
      if (!aLow && bLow) return 1;
      return a.name.localeCompare(b.name);
    });

  const handleStockAdjust = async (product: GroceryProduct) => {
    if (!editState || editState.productId !== product._id) return;
    const val = parseFloat(editState.value);
    if (isNaN(val) || val < 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    let change = 0;
    if (editState.mode === "add") change = val;
    else if (editState.mode === "remove") change = -val;
    else change = val - product.stockQuantity; // set mode

    try {
      await adjustStock({ productId: product._id, quantityChange: change, reason: "manual_adjustment" });
      toast.success(`Stock updated for ${product.name}`);
      setEditState(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to update stock");
    }
  };

  const handlePriceUpdate = async (product: GroceryProduct) => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Enter a valid price");
      return;
    }
    try {
      await updateProduct({ productId: product._id, sellingPrice: price });
      toast.success(`Price updated for ${product.name}`);
      setEditPriceId(null);
      setNewPrice("");
    } catch (e: any) {
      toast.error(e.message || "Failed to update price");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 scrollbar-hide">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* ── Low stock banner ── */}
        {lowStockProducts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800">
                {lowStockProducts.length} product{lowStockProducts.length !== 1 ? "s" : ""} running low
              </p>
              <p className="text-[11px] text-amber-600 font-medium">
                {lowStockProducts.slice(0, 3).map((p) => p.name).join(", ")}
                {lowStockProducts.length > 3 ? ` +${lowStockProducts.length - 3} more` : ""}
              </p>
            </div>
            <button
              onClick={() => setFilterLow(true)}
              className="ml-auto text-[11px] font-black text-amber-700 bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl hover:bg-amber-200 transition-colors whitespace-nowrap"
            >
              View All
            </button>
          </div>
        )}

        {/* ── Controls ── */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full h-9 pl-8 pr-3 bg-white border border-[#E8E5DF] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2D6A4F]/20 focus:border-[#2D6A4F]/50 transition-all"
            />
          </div>
          <button
            onClick={() => setFilterLow((v) => !v)}
            className={`h-9 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              filterLow
                ? "bg-amber-500 border-amber-500 text-white"
                : "bg-white border-[#E8E5DF] text-gray-500 hover:border-gray-300"
            }`}
          >
            <AlertTriangle size={12} />
            Low Stock
          </button>
          <button
            onClick={() => setIsStockInOpen(true)}
            className="h-9 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-700 transition-all shadow-md active:scale-95 whitespace-nowrap"
          >
            <ArrowUp size={14} />
            Bulk Stock-In
          </button>
        </div>

        {/* ── Product table ── */}
        <div className="bg-white border border-[#E8E5DF] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_100px_120px_130px] gap-0 text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 py-2.5 border-b border-[#E8E5DF] bg-[#F7F6F3]">
            <span>Product</span>
            <span className="text-right">Price</span>
            <span className="text-right">Stock</span>
            <span className="text-right">Adjust</span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center">
              <Package size={24} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-400 font-semibold">No products found</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F7F6F3]">
              {filteredProducts.map((product) => {
                const isLow = product.stockQuantity <= product.lowStockThreshold;
                const isOut = product.stockQuantity === 0;
                const isEditing = editState?.productId === product._id;
                const isEditingPrice = editPriceId === product._id;

                return (
                  <div key={product._id} className={`grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_100px_120px_130px] gap-0 items-center px-4 py-3 ${isLow ? "bg-amber-50/30" : ""}`}>
                    {/* Name + meta */}
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle size={11} className={isOut ? "text-red-400" : "text-amber-400"} />}
                        <p className="text-sm font-bold text-gray-900 truncate">{product.name}</p>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                        {product.category}
                        {product.subCategory ? ` · ${product.subCategory}` : ""}
                        {product.barcode ? ` · ${product.barcode}` : ""}
                      </p>
                    </div>

                    {/* Price (editable) */}
                    <div className="text-right">
                      {isEditingPrice ? (
                        <div className="flex items-center gap-1 justify-end">
                          <input
                            autoFocus
                            type="number"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            className="w-16 h-7 text-xs text-right border border-[#2D6A4F]/50 rounded-lg px-1.5 outline-none"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handlePriceUpdate(product);
                              if (e.key === "Escape") { setEditPriceId(null); setNewPrice(""); }
                            }}
                          />
                          <button onClick={() => handlePriceUpdate(product)} className="text-[#2D6A4F] hover:opacity-70 transition-opacity">
                            <Check size={12} />
                          </button>
                          <button onClick={() => { setEditPriceId(null); setNewPrice(""); }} className="text-gray-400 hover:text-red-500 transition-colors">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditPriceId(product._id); setNewPrice(String(product.sellingPrice)); }}
                          className="group flex items-center gap-1 justify-end ml-auto"
                        >
                          <span className="text-sm font-black text-gray-900 tabular-nums">₹{product.sellingPrice}</span>
                          <Edit3 size={10} className="text-gray-300 group-hover:text-[#2D6A4F] transition-colors" />
                        </button>
                      )}
                      <p className="text-[10px] text-gray-400 font-medium">/{product.unit}</p>
                    </div>

                    {/* Stock level */}
                    <div className="text-right">
                      <p className={`text-sm font-black tabular-nums ${isOut ? "text-red-500" : isLow ? "text-amber-500" : "text-gray-900"}`}>
                        {product.stockQuantity}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        min {product.lowStockThreshold} {product.unit}
                      </p>
                    </div>

                    {/* Stock adjust controls */}
                    <div className="flex items-center justify-end gap-1.5">
                      {isEditing ? (
                        <>
                          <div className="flex items-center gap-1 bg-[#F7F6F3] border border-[#E8E5DF] rounded-xl px-2 py-1">
                            {(["remove", "set", "add"] as const).map((mode) => (
                              <button
                                key={mode}
                                onClick={() => setEditState({ ...editState!, mode })}
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg transition-all ${
                                  editState?.mode === mode ? "bg-[#2D6A4F] text-white" : "text-gray-400 hover:text-gray-700"
                                }`}
                              >
                                {mode === "add" ? <ArrowUp size={10} /> : mode === "remove" ? <ArrowDown size={10} /> : "="}
                              </button>
                            ))}
                          </div>
                          <input
                            autoFocus
                            type="number"
                            min={0}
                            value={editState?.value ?? ""}
                            onChange={(e) => setEditState((s) => s ? { ...s, value: e.target.value } : s)}
                            className="w-16 h-7 text-xs text-center border border-[#2D6A4F]/50 rounded-xl outline-none px-1.5"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleStockAdjust(product);
                              if (e.key === "Escape") setEditState(null);
                            }}
                          />
                          <button
                            onClick={() => handleStockAdjust(product)}
                            className="w-7 h-7 bg-[#2D6A4F] text-white rounded-xl flex items-center justify-center hover:bg-[#1B4332] transition-colors"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => setEditState(null)}
                            className="w-7 h-7 bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setEditState({ productId: product._id, value: "", mode: "add" })}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-[#F7F6F3] border border-[#E8E5DF] rounded-xl text-xs font-bold text-gray-500 hover:border-[#2D6A4F]/40 hover:text-[#2D6A4F] transition-all"
                        >
                          <ArrowUp size={11} />
                          Stock
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isStockInOpen && (
          <GroceryBulkStockInModal 
            products={products} 
            onClose={() => setIsStockInOpen(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
