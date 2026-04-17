"use client";

// ─────────────────────────────────────────────────────────────────────────────
// GroceryPOS.tsx — Orchestrator: wires cart state + renders all sub-components
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { Scan, Terminal } from "lucide-react";

import { GroceryTopbar } from "./GroceryTopbar";
import { GroceryCategoryRail } from "./GroceryCategoryRail";
import { GroceryProductGrid } from "./GroceryProductGrid";
import { GroceryCartBar } from "./GroceryCartBar";
import { GroceryCheckoutDrawer } from "./GroceryCheckoutDrawer";
import { GrocerySalesPanel } from "./GrocerySalesPanel";
import { GroceryInventoryPanel } from "./GroceryInventoryPanel";
import { GroceryAddProductModal } from "./GroceryAddProductModal";
import { CounterSelector } from "./CounterSelector";
import { BarcodeScannerUI } from "./BarcodeScannerUI";

// ── Types ──────────────────────────────────────────────────────────────────

export type GroceryProduct = {
  _id: Id<"groceryProducts">;
  name: string;
  category: string;
  subCategory?: string;
  barcode?: string;
  unit: string;
  sellingPrice: number;
  costPrice?: number;
  gstRate?: number;
  stockQuantity: number;
  lowStockThreshold: number;
  description?: string;
  image?: string;
  isActive: boolean;
};

export type CartItem = {
  cartId: string;
  product: GroceryProduct;
  quantity: number;
};

export type ActiveView = "pos" | "sales" | "inventory";

// ── Component ──────────────────────────────────────────────────────────────

interface GroceryPOSProps {
  products: GroceryProduct[];
  categories: { id: string; name: string }[];
  lowStockProducts: GroceryProduct[];
}

export function GroceryPOS({ products, categories, lowStockProducts }: GroceryPOSProps) {
  // ── View state
  const [activeView, setActiveView] = useState<ActiveView>("pos");

  // ── Terminal / Counter State
  const [selectedCounter, setSelectedCounter] = useState<{ id: Id<"storeCounters">; name: string } | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // ── POS state
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  // ── Database Cart Sync 
  const dbCart = useQuery(api.grocery.getActiveCart, selectedCounter ? { counterId: selectedCounter.id } : "skip");
  
  // Transform DB items into CartItem format
  const cart: CartItem[] = (dbCart?.items || []).map(item => {
    const product = products.find(p => p._id === item.productId);
    return {
      cartId: item.cartId,
      product: product || {
        _id: item.productId,
        name: item.name,
        sellingPrice: item.price,
        unit: item.unit,
        isActive: true,
        category: "Unknown",
        stockQuantity: 999,
        lowStockThreshold: 1,
      } as any,
      quantity: item.quantity
    };
  });

  // ── Mutations
  const createSale = useMutation(api.grocery.createGrocerySale);
  const addByBarcode = useMutation(api.grocery.syncCartItemByBarcode);
  const updateDbCartQty = useMutation(api.grocery.updateActiveCartQty);
  const addToDbCart = useMutation(api.grocery.addProductToActiveCart);
  const clearDbCart = useMutation(api.grocery.clearActiveCart);

  // ── Cart helpers ───────────────────────────────────────────────────────────

  const addToCart = useCallback(async (product: GroceryProduct) => {
    if (!selectedCounter) return;
    if (product.stockQuantity === 0) {
      toast.error("Out of stock");
      return;
    }
    const existing = cart.find((i) => i.product._id === product._id);
    if (existing && existing.quantity >= product.stockQuantity) {
      toast.error(`Max stock: ${product.stockQuantity}`);
      return;
    }

    try {
      await addToDbCart({ counterId: selectedCounter.id, productId: product._id });
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [selectedCounter, cart, addToDbCart]);

  const removeFromCart = useCallback(async (cartId: string) => {
    if (!selectedCounter) return;
    const item = cart.find(i => i.cartId === cartId);
    if (!item) return;
    try {
      await updateDbCartQty({ 
        counterId: selectedCounter.id, 
        productId: item.product._id, 
        quantity: item.quantity - 1 
      });
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [selectedCounter, cart, updateDbCartQty]);

  const setCartItemQty = useCallback(async (cartId: string, qty: number) => {
    if (!selectedCounter) return;
    const item = cart.find(i => i.cartId === cartId);
    if (!item) return;

    if (qty > item.product.stockQuantity) {
      toast.error(`Max stock: ${item.product.stockQuantity}`);
      return;
    }

    try {
      await updateDbCartQty({ 
        counterId: selectedCounter.id, 
        productId: item.product._id, 
        quantity: qty 
      });
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [selectedCounter, cart, updateDbCartQty]);

  const clearCart = useCallback(async () => {
    if (!selectedCounter) return;
    await clearDbCart({ counterId: selectedCounter.id });
  }, [selectedCounter, clearDbCart]);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // Frequency in hertz
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // Volume

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1); // Short beep
    } catch (e) {
      console.error("Audio beep failed", e);
    }
  };

  const handleBarcodeDetected = async (code: string) => {
    if (!selectedCounter) return;
    try {
      const result = await addByBarcode({ counterId: selectedCounter.id, barcode: code });
      playBeep();
      toast.success(`Scanned: ${result.productName}`);
      // Don't close scanner automatically, allow multiple scans
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // ── Totals ─────────────────────────────────────────────────────────────────

  const subtotal = cart.reduce((a, i) => a + i.product.sellingPrice * i.quantity, 0);
  const totalItems = cart.reduce((a, i) => a + i.quantity, 0);

  // ── Sale submission ────────────────────────────────────────────────────────

  const handleSaleComplete = useCallback(
    async (opts: {
      paymentMethod: string;
      discountAmount: number;
      customerName?: string;
      customerPhone?: string;
      isGstBill: boolean;
      gstin?: string;
    }) => {
      try {
        const result = await createSale({
          ...opts,
          items: cart.map((i) => ({
            productId: i.product._id,
            name: i.product.name,
            unit: i.product.unit,
            quantity: i.quantity,
            sellingPrice: i.product.sellingPrice,
            gstRate: i.product.gstRate ?? 0,
          })),
        });
        toast.success(`✅ Sale ${result.receiptNumber} · ₹${result.totalAmount.toLocaleString()}`);
        await clearCart();
        setIsCheckoutOpen(false);
      } catch (e: any) {
        toast.error(e.message || "Sale failed");
        throw e;
      }
    },
    [cart, createSale, clearCart]
  );

  // ── Filtered products ──────────────────────────────────────────────────────

  const filteredProducts = products.filter((p) => {
    if (search) return p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search);
    return p.category === activeCategory;
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen w-full bg-[#F7F6F3] font-['DM_Sans',sans-serif] overflow-hidden">
      {!selectedCounter && (
        <CounterSelector onSelect={(id, name) => setSelectedCounter({ id, name })} />
      )}

      {selectedCounter && (
        <div className="absolute top-2 right-4 z-50 flex items-center gap-2">
           <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-200 flex items-center gap-2 shadow-sm">
              <Terminal size={14} className="text-emerald-600" />
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{selectedCounter.name}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
           </div>
        </div>
      )}

      <AnimatePresence>
        {showScanner && (
          <BarcodeScannerUI 
            onClose={() => setShowScanner(false)} 
            onDetected={handleBarcodeDetected} 
          />
        )}
      </AnimatePresence>
      {/* Google font import via style tag */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .mono { font-family: 'DM Mono', monospace; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .cart-item-enter { animation: slideUp 0.2s ease; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <GroceryTopbar
        activeView={activeView}
        onViewChange={setActiveView}
        lowStockCount={lowStockProducts.length}
        onAddProduct={() => setIsAddProductOpen(true)}
      />

      {/* ── POS View ── */}
      {activeView === "pos" && (
        <div className="flex flex-1 min-h-0">
          {/* Left: product browser */}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <GroceryCategoryRail
              categories={categories}
              activeCategory={activeCategory}
              onSelect={setActiveCategory}
              search={search}
              onSearchChange={setSearch}
              onScanClick={() => setShowScanner(true)}
            />
            <GroceryProductGrid
              products={filteredProducts}
              cart={cart}
              onAdd={addToCart}
              search={search}
            />
          </div>

          {/* Right sidebar cart — desktop only */}
          <div className="hidden lg:flex flex-col w-80 xl:w-96 border-l border-[#E8E5DF] bg-white">
            <GroceryCartSidebar
              cart={cart}
              subtotal={subtotal}
              onAdd={addToCart}
              onRemove={removeFromCart}
              onSetQty={setCartItemQty}
              onClear={clearCart}
              onCheckout={() => setIsCheckoutOpen(true)}
            />
          </div>
        </div>
      )}

      {/* ── Sales View ── */}
      {activeView === "sales" && <GrocerySalesPanel />}

      {/* ── Inventory View ── */}
      {activeView === "inventory" && (
        <GroceryInventoryPanel
          products={products}
          lowStockProducts={lowStockProducts}
        />
      )}

      {/* ── Mobile floating cart bar ── */}
      {activeView === "pos" && (
        <AnimatePresence>
          {totalItems > 0 && (
            <GroceryCartBar
              totalItems={totalItems}
              subtotal={subtotal}
              onOpen={() => setIsCheckoutOpen(true)}
            />
          )}
        </AnimatePresence>
      )}

      {/* ── Checkout drawer ── */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <GroceryCheckoutDrawer
            cart={cart}
            subtotal={subtotal}
            onAdd={addToCart}
            onRemove={removeFromCart}
            onSetQty={setCartItemQty}
            onClose={() => setIsCheckoutOpen(false)}
            onComplete={handleSaleComplete}
          />
        )}
      </AnimatePresence>

      {/* ── Add Product modal ── */}
      <AnimatePresence>
        {isAddProductOpen && (
          <GroceryAddProductModal
            categories={categories.map((c) => c.name)}
            onClose={() => setIsAddProductOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Inline cart sidebar (desktop) ─────────────────────────────────────────────
// Kept here to avoid an extra file for a layout-only concern.

import { Trash2, Plus, Minus, ShoppingCart } from "lucide-react";

function GroceryCartSidebar({
  cart,
  subtotal,
  onAdd,
  onRemove,
  onSetQty,
  onClear,
  onCheckout,
}: {
  cart: CartItem[];
  subtotal: number;
  onAdd: (p: GroceryProduct) => void;
  onRemove: (cartId: string) => void;
  onSetQty: (cartId: string, qty: number) => void;
  onClear: () => void;
  onCheckout: () => void;
}) {
  const totalItems = cart.reduce((a, i) => a + i.quantity, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E5DF]">
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} className="text-[#2D6A4F]" />
          <span className="font-bold text-gray-900 text-sm">Cart</span>
          {totalItems > 0 && (
            <span className="bg-[#2D6A4F] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {totalItems}
            </span>
          )}
        </div>
        {cart.length > 0 && (
          <button
            onClick={onClear}
            className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
          >
            <Trash2 size={11} />
            Clear
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-hide">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-16 h-16 bg-[#F7F6F3] rounded-2xl flex items-center justify-center mb-3">
              <ShoppingCart size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-400">Cart is empty</p>
            <p className="text-xs text-gray-300 mt-1">Tap products to add them</p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.cartId}
              className="cart-item-enter flex items-center gap-3 p-3 bg-[#F7F6F3] rounded-2xl group"
            >
              {/* Stock indicator dot */}
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${
                  item.product.stockQuantity <= item.product.lowStockThreshold
                    ? "bg-amber-400"
                    : "bg-[#2D6A4F]"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{item.product.name}</p>
                <p className="text-[10px] text-gray-400 font-medium">
                  ₹{item.product.sellingPrice} / {item.product.unit}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => onRemove(item.cartId)}
                  className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition-all"
                >
                  <Minus size={10} />
                </button>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => onSetQty(item.cartId, parseFloat(e.target.value) || 0)}
                  className="w-10 text-center text-sm font-black text-gray-900 bg-white border border-gray-200 rounded-lg h-6 outline-none focus:border-[#2D6A4F]"
                />
                <button
                  onClick={() => onAdd(item.product)}
                  className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#2D6A4F] hover:border-[#2D6A4F] transition-all"
                >
                  <Plus size={10} />
                </button>
              </div>
              <span className="text-sm font-black text-gray-900 w-16 text-right tabular-nums shrink-0">
                ₹{(item.product.sellingPrice * item.quantity).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {cart.length > 0 && (
        <div className="border-t border-[#E8E5DF] p-5 space-y-3 bg-white">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">Subtotal</span>
            <span className="font-black text-gray-900 tabular-nums">₹{subtotal.toLocaleString()}</span>
          </div>
          <button
            onClick={onCheckout}
            className="w-full h-12 bg-[#2D6A4F] hover:bg-[#1B4332] text-white font-bold rounded-2xl transition-all text-sm tracking-wide shadow-lg shadow-[#2D6A4F]/20 active:scale-[0.98]"
          >
            Checkout · ₹{subtotal.toLocaleString()}
          </button>
        </div>
      )}
    </div>
  );
}
