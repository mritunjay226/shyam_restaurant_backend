"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { motion } from "framer-motion";
import { X, Printer, CheckCircle2, ShoppingBag } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface GroceryReceiptModalProps {
  saleId: Id<"grocerySales">;
  onClose: () => void;
}

export function GroceryReceiptModal({ saleId, onClose }: GroceryReceiptModalProps) {
  const sale = useQuery(api.grocery.getGrocerySaleById, { saleId });

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header decoration */}
        <div className="h-2 bg-emerald-500 w-full" />
        
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Sale Completed!</h2>
            <p className="text-sm text-gray-500 font-medium">Receipt {sale.receiptNumber}</p>
          </div>

          {/* ── Receipt Content (Printable Area) ── */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 print:p-0 print:bg-white print:border-none" id="printable-receipt">
            <div className="text-center mb-6">
              <h3 className="text-lg font-black text-gray-900 uppercase">Shyam Supermarket</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Lucknow Road, Prayagraj</p>
              <div className="h-px bg-dashed border-gray-300 my-4" />
            </div>

            <div className="space-y-1.5 mb-6">
              <div className="flex justify-between text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                <span>Date</span>
                <span>{format(new Date(sale.createdAt), "dd MMM yyyy · hh:mm a")}</span>
              </div>
              {sale.customerName && (
                <div className="flex justify-between text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                  <span>Customer</span>
                  <span className="text-gray-900">{sale.customerName}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                <span>Payment</span>
                <span className="text-gray-900">{sale.paymentMethod.toUpperCase()}</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="grid grid-cols-[1fr_50px_80px] text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2">
                <span>Item</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Price</span>
              </div>
              {sale.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_50px_80px] items-start text-xs font-bold text-gray-900">
                  <div className="pr-2">
                    <p className="truncate">{item.name}</p>
                    <p className="text-[9px] text-gray-400 italic">₹{item.sellingPrice}/{item.unit}</p>
                  </div>
                  <span className="text-center tabular-nums">{item.quantity}</span>
                  <span className="text-right tabular-nums">₹{(item.sellingPrice * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="h-px bg-gray-200 mb-4" />

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500 font-bold">
                <span>Subtotal</span>
                <span className="text-gray-900">₹{sale.subtotal.toFixed(2)}</span>
              </div>
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-xs text-emerald-600 font-bold">
                  <span>Discount</span>
                  <span>− ₹{sale.discountAmount.toFixed(2)}</span>
                </div>
              )}
               {sale.gstAmount > 0 && (
                <div className="flex justify-between text-xs text-gray-500 font-bold">
                  <span>GST Total</span>
                  <span className="text-gray-900">₹{sale.gstAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-black text-gray-900 pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>₹{sale.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-8 text-center bg-gray-900 text-white p-3 rounded-xl">
               <p className="text-[10px] font-black uppercase tracking-[0.2em]">Thank you for shopping!</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-white border-t border-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-12 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 h-12 rounded-2xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Printer size={18} />
            Print Receipt
          </button>
        </div>

        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-receipt, #printable-receipt * {
              visibility: visible;
            }
            #printable-receipt {
              position: absolute;
              left: 0;
              top: 0;
              width: 80mm;
              background-color: transparent;
            }
            @page {
              size: 80mm auto;
              margin: 0;
            }
          }
        `}</style>
      </motion.div>
    </div>
  );
}
