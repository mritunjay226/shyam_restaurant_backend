"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { X, Scan, Package, Plus, Minus, Trash2, Check, Banknote, FileText } from "lucide-react";
import { BarcodeScannerUI } from "./BarcodeScannerUI";
import { type GroceryProduct } from "./GroceryPOS";
import { toast } from "sonner";

interface StockInItem {
  product: GroceryProduct;
  quantity: number;
  costPrice: number;
}

interface GroceryBulkStockInModalProps {
  products: GroceryProduct[];
  onClose: () => void;
}

export function GroceryBulkStockInModal({ products, onClose }: GroceryBulkStockInModalProps) {
  const [items, setItems] = useState<StockInItem[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [invoice, setInvoice] = useState("");

  const recordPurchase = useMutation(api.grocery.recordGroceryPurchase);

  const handleBarcodeDetected = useCallback((barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (!product) {
      toast.error(`Product with barcode ${barcode} not found`);
      return;
    }

    setItems(prev => {
      const idx = prev.findIndex(item => item.product._id === product._id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { product, quantity: 1, costPrice: product.costPrice ?? 0 }];
    });
    
    toast.success(`Added: ${product.name}`);
  }, [products]);

  const updateItem = (productId: string, updates: Partial<StockInItem>) => {
    setItems(prev => prev.map(item => 
      item.product._id === productId ? { ...item, ...updates } : item
    ));
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(item => item.product._id !== productId));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
  };

  const handleConfirm = async () => {
    if (items.length === 0) return;
    setIsSubmitting(true);
    try {
      await recordPurchase({
        supplierName: supplier.trim() || undefined,
        invoiceNumber: invoice.trim() || undefined,
        items: items.map(i => ({
          productId: i.product._id as Id<"groceryProducts">,
          quantity: i.quantity,
          costPrice: i.costPrice,
        })),
        totalCost: calculateTotal(),
        purchaseDate: new Date().toISOString().split("T")[0],
      });
      toast.success("Stock-In completed successfully");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to record stock-in");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Bulk Stock-In</h2>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Inventory Intake Terminal</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95"
            >
              <Scan size={14} />
              Open Scanner
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          {/* Supplier Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Supplier Name</label>
              <div className="relative">
                <Banknote size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="e.g. Reliance Fresh"
                  className="w-full h-11 pl-10 pr-4 bg-[#F7F6F3] border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Invoice Number</label>
              <div className="relative">
                <FileText size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  value={invoice}
                  onChange={(e) => setInvoice(e.target.value)}
                  placeholder="e.g. INV-987"
                  className="w-full h-11 pl-10 pr-4 bg-[#F7F6F3] border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Scanned Items */}
          <div className="space-y-3">
             <div className="flex items-center justify-between px-1">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Intake Items ({items.length})</p>
               {items.length > 0 && <button onClick={() => setItems([])} className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Clear All</button>}
             </div>
             
             {items.length === 0 ? (
               <div className="py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                 <Package size={32} className="text-gray-200 mb-2" />
                 <p className="text-sm text-gray-400 font-bold">No items scanned yet.</p>
                 <p className="text-[11px] text-gray-300">Tap the green button above to start scanning.</p>
               </div>
             ) : (
               <div className="space-y-2">
                 {items.map((item) => (
                   <div key={item.product._id} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center gap-4 shadow-sm">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">{item.product.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold">Current Stock: {item.product.stockQuantity} {item.product.unit}</p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <label className="text-[9px] font-black text-gray-300 uppercase">Qty</label>
                          <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl p-1">
                             <button onClick={() => updateItem(item.product._id, { quantity: Math.max(1, item.quantity - 1) })} className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400"><Minus size={10}/></button>
                             <input 
                               value={item.quantity} 
                               onChange={(e) => updateItem(item.product._id, { quantity: parseInt(e.target.value) || 0 })}
                               className="w-10 bg-transparent text-center text-xs font-black outline-none" 
                             />
                             <button onClick={() => updateItem(item.product._id, { quantity: item.quantity + 1 })} className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400"><Plus size={10}/></button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                           <label className="text-[9px] font-black text-gray-300 uppercase">Cost</label>
                           <div className="relative">
                             <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">₹</span>
                             <input 
                                value={item.costPrice}
                                onChange={(e) => updateItem(item.product._id, { costPrice: parseFloat(e.target.value) || 0 })}
                                className="w-20 h-7 pl-4 pr-1.5 bg-gray-50 border border-transparent rounded-lg text-xs font-bold text-gray-700 outline-none focus:border-emerald-500/30"
                             />
                           </div>
                           <button onClick={() => removeItem(item.product._id)} className="w-7 h-7 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                        </div>
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-gray-50 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">Total Value</p>
            <p className="text-lg font-black text-gray-900">₹{calculateTotal().toLocaleString()}</p>
          </div>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || items.length === 0}
            className="px-8 h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 active:scale-95"
          >
            {isSubmitting ? "Processing..." : (
               <>
                 <Check size={18} />
                 Confirm Stock-In
               </>
            )}
          </button>
        </div>

        {/* Inner Scanner */}
        <AnimatePresence>
          {showScanner && (
            <div className="absolute inset-0 z-60">
               <BarcodeScannerUI onClose={() => setShowScanner(false)} onDetected={handleBarcodeDetected} />
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
