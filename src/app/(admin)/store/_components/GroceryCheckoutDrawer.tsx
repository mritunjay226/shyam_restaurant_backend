"use client";

// ─────────────────────────────────────────────────────────────────────────────
// GroceryCheckoutDrawer.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { type CartItem, type GroceryProduct } from "./GroceryPOS";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { 
  X, Plus, Minus, User, Percent, Receipt, 
  Banknote, Smartphone, CreditCard, ChevronDown, ChevronUp 
} from "lucide-react";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: <Banknote size={14} /> },
  { value: "upi", label: "UPI", icon: <Smartphone size={14} /> },
  { value: "card", label: "Card", icon: <CreditCard size={14} /> },
  { value: "credit", label: "Credit", icon: <Receipt size={14} /> },
];

interface GroceryCheckoutDrawerProps {
  cart: CartItem[];
  subtotal: number;
  onAdd: (p: GroceryProduct) => void;
  onRemove: (cartId: string) => void;
  onSetQty: (cartId: string, qty: number) => void;
  onClose: () => void;
  onComplete: (opts: {
    paymentMethod: string;
    discountAmount: number;
    customerName?: string;
    customerPhone?: string;
    isGstBill: boolean;
    gstin?: string;
  }) => Promise<void>;
}

export function GroceryCheckoutDrawer({
  cart,
  subtotal,
  onAdd,
  onRemove,
  onSetQty,
  onClose,
  onComplete,
}: GroceryCheckoutDrawerProps) {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState("");
  const [isGstBill, setIsGstBill] = useState(false);
  const [gstin, setGstin] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showCustomer, setShowCustomer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Auto-fill logic ────────────────────────────────────────────────────────
  const recentCustomer = useQuery(api.grocery.getGroceryCustomerByPhone, 
    customerPhone.length >= 10 ? { phone: customerPhone } : "skip"
  );

  useEffect(() => {
    if (recentCustomer?.name && !customerName) {
      setCustomerName(recentCustomer.name);
    }
  }, [recentCustomer, customerName]);

  // ── Computed totals ────────────────────────────────────────────────────────

  const discountAmt = Math.min(parseFloat(discount) || 0, subtotal);
  const afterDiscount = subtotal - discountAmt;

  // Per-item GST (each product carries its own gstRate)
  const gstTotal = cart.reduce((acc, item) => {
    const rate = item.product.gstRate ?? 0;
    return acc + item.product.sellingPrice * item.quantity * (rate / 100);
  }, 0);
  const gstOnDiscounted = isGstBill
    ? Math.round(((afterDiscount / subtotal) || 1) * gstTotal * 100) / 100
    : 0;

  const grandTotal = Math.round((afterDiscount + gstOnDiscounted) * 100) / 100;

  const handleCheckout = async () => {
    setIsSubmitting(true);
    try {
      await onComplete({
        paymentMethod,
        discountAmount: discountAmt,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        isGstBill,
        gstin: gstin.trim() || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        className="relative bg-white w-full sm:rounded-3xl sm:max-w-lg sm:mx-4 overflow-hidden flex flex-col max-h-[94dvh] rounded-t-3xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-black text-gray-900">Checkout</h2>
            <p className="text-[11px] text-gray-400 font-medium">
              {cart.reduce((a, i) => a + i.quantity, 0)} items · {cart.length} product{cart.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X size={15} className="text-gray-600" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* ── Cart items ── */}
          <div className="px-5 py-4 space-y-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Items</p>
            {cart.map((item) => (
              <div
                key={item.cartId}
                className="flex items-center gap-3 p-3 bg-[#F7F6F3] rounded-2xl"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{item.product.name}</p>
                  <p className="text-[10px] text-gray-400">
                    ₹{item.product.sellingPrice}/{item.product.unit}
                    {item.product.gstRate ? ` · GST ${item.product.gstRate}%` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onRemove(item.cartId)}
                    className="w-7 h-7 bg-white rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="w-8 text-center text-sm font-black text-gray-900 tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onAdd(item.product)}
                    className="w-7 h-7 bg-white rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#2D6A4F] transition-colors"
                  >
                    <Plus size={11} />
                  </button>
                </div>
                <span className="text-sm font-black text-gray-900 w-16 text-right tabular-nums shrink-0">
                  ₹{(item.product.sellingPrice * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="h-px bg-gray-100 mx-5" />

          {/* ── Customer info (collapsible) ── */}
          <div className="px-5 py-4">
            <button
              onClick={() => setShowCustomer((v) => !v)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-2">
                <User size={14} className="text-gray-400" />
                <span className="text-sm font-bold text-gray-700">Customer Info</span>
                <span className="text-[10px] text-gray-400 font-medium">(optional)</span>
              </div>
              {showCustomer ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </button>
            {showCustomer && (
              <div className="mt-3 space-y-2">
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="w-full h-9 px-3 bg-[#F7F6F3] border border-[#E8E5DF] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2D6A4F]/20 focus:border-[#2D6A4F]/50 transition-all"
                />
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone number"
                  type="tel"
                  className="w-full h-9 px-3 bg-[#F7F6F3] border border-[#E8E5DF] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2D6A4F]/20 focus:border-[#2D6A4F]/50 transition-all"
                />
              </div>
            )}
          </div>

          <div className="h-px bg-gray-100 mx-5" />

          {/* ── Discount ── */}
          <div className="px-5 py-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
              Discount (₹)
            </label>
            <div className="relative">
              <Percent size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="number"
                min={0}
                max={subtotal}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
                className="w-full h-9 pl-8 pr-3 bg-[#F7F6F3] border border-[#E8E5DF] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2D6A4F]/20 focus:border-[#2D6A4F]/50 transition-all"
              />
            </div>
          </div>

          <div className="h-px bg-gray-100 mx-5" />

          {/* ── GST toggle ── */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between bg-[#F7F6F3] rounded-2xl px-4 py-3">
              <div>
                <p className="text-sm font-bold text-gray-700">GST Invoice</p>
                <p className="text-[10px] text-gray-400 font-medium">
                  Per-item GST rates · ₹{gstTotal.toFixed(2)} applicable
                </p>
              </div>
              <button
                onClick={() => setIsGstBill((v) => !v)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  isGstBill ? "bg-[#2D6A4F]" : "bg-gray-200"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    isGstBill ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            {isGstBill && (
              <input
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="GSTIN (optional)"
                className="mt-2 w-full h-9 px-3 bg-[#F7F6F3] border border-[#E8E5DF] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2D6A4F]/20 focus:border-[#2D6A4F]/50 transition-all mono"
              />
            )}
          </div>

          <div className="h-px bg-gray-100 mx-5" />

          {/* ── Payment method ── */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Payment Method</p>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setPaymentMethod(m.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 py-3 rounded-2xl border text-xs font-bold transition-all",
                    paymentMethod === m.value
                      ? "bg-[#2D6A4F] border-[#2D6A4F] text-white shadow-md shadow-[#2D6A4F]/20"
                      : "bg-[#F7F6F3] border-[#E8E5DF] text-gray-500 hover:border-gray-300"
                  )}
                >
                  {m.icon}
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-gray-100 mx-5" />

          {/* ── Bill summary ── */}
          <div className="px-5 py-4 space-y-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Summary</p>
            <div className="bg-[#F7F6F3] rounded-2xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-bold tabular-nums">₹{subtotal.toLocaleString()}</span>
              </div>
              {discountAmt > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span className="font-bold">− ₹{discountAmt.toLocaleString()}</span>
                </div>
              )}
              {isGstBill && (
                <div className="flex justify-between text-gray-600">
                  <span>GST (item-wise)</span>
                  <span className="font-bold tabular-nums">₹{gstOnDiscounted.toFixed(2)}</span>
                </div>
              )}
              <div className="h-px bg-gray-200 my-1" />
              <div className="flex justify-between text-gray-900 font-black text-base">
                <span>Total</span>
                <span className="tabular-nums">₹{grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Bottom padding for fixed button */}
          <div className="h-24" />
        </div>

        {/* ── Fixed action button ── */}
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100">
          <button
            onClick={handleCheckout}
            disabled={isSubmitting || cart.length === 0}
            className="w-full h-13 bg-[#2D6A4F] hover:bg-[#1B4332] disabled:opacity-60 text-white font-black rounded-2xl transition-all text-sm shadow-lg shadow-[#2D6A4F]/25 active:scale-[0.98] tracking-wide py-3.5"
          >
            {isSubmitting
              ? "Processing…"
              : `Confirm Sale · ₹${grandTotal.toLocaleString()} via ${paymentMethod.toUpperCase()}`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
