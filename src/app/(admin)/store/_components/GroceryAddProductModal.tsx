"use client";

// ─────────────────────────────────────────────────────────────────────────────
// GroceryAddProductModal.tsx
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, ScanLine, Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { toast } from "sonner";
import { readBarcodesFromImageFile } from "zxing-wasm/reader";

const UNITS = ["kg", "g", "litre", "ml", "piece", "packet", "dozen", "bundle", "box", "can", "bottle"];
const GST_RATES = [0, 5, 12, 18, 28];

interface GroceryAddProductModalProps {
  categories: string[];
  onClose: () => void;
}

export function GroceryAddProductModal({ categories, onClose }: GroceryAddProductModalProps) {
  const addProduct = useMutation(api.grocery.addGroceryProduct);

  const [form, setForm] = useState({
    name: "",
    category: categories[0] ?? "",
    customCategory: "",
    subCategory: "",
    barcode: "",
    unit: "piece",
    sellingPrice: "",
    costPrice: "",
    gstRate: "0",
    stockQuantity: "",
    lowStockThreshold: "5",
    description: "",
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);

  const set = (key: keyof typeof form, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  // ── Auto-Fill Logic using Open Food Facts API ──────────────────────────────
  const handleBarcodeDetected = async (code: string) => {
    setIsScanning(false);
    set("barcode", code);
    setIsFetchingInfo(true);
    
    toast.loading("Fetching product details...", { id: "fetch-product" });

    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
      const data = await res.json();

      if (data.status === 1 && data.product) {
        toast.success("Product found!", { id: "fetch-product" });
        
        // Try to parse the unit from the quantity string (e.g., "500 g" -> "g")
        let detectedUnit = form.unit;
        const qtyString = (data.product.quantity || "").toLowerCase();
        for (const u of UNITS) {
          if (qtyString.includes(u)) {
            detectedUnit = u;
            break;
          }
        }

        setForm(prev => ({
          ...prev,
          name: data.product.product_name || prev.name,
          unit: detectedUnit,
          // You can also map API categories to your local categories if they match
        }));
      } else {
        toast.info("Barcode scanned. Product not in global database, please fill manually.", { id: "fetch-product" });
      }
    } catch (e) {
      toast.error("Failed to fetch product info.", { id: "fetch-product" });
    } finally {
      setIsFetchingInfo(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Product name required"); return; }
    if (!form.sellingPrice || parseFloat(form.sellingPrice) <= 0) { toast.error("Enter a valid selling price"); return; }
    if (!form.stockQuantity || parseFloat(form.stockQuantity) < 0) { toast.error("Enter a valid stock quantity"); return; }

    setIsSubmitting(true);
    try {
      await addProduct({
        name: form.name.trim(),
        category: form.category === "__new__" ? form.customCategory.trim() : form.category,
        subCategory: form.subCategory.trim() || undefined,
        barcode: form.barcode.trim() || undefined,
        unit: form.unit,
        sellingPrice: parseFloat(form.sellingPrice),
        costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
        gstRate: parseInt(form.gstRate),
        stockQuantity: parseFloat(form.stockQuantity),
        lowStockThreshold: parseFloat(form.lowStockThreshold) || 5,
        description: form.description.trim() || undefined,
        isActive: true,
      });
      toast.success(`${form.name} added to inventory`);
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to add product");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        className="relative bg-white w-full sm:rounded-3xl sm:max-w-lg sm:mx-4 rounded-t-3xl overflow-hidden flex flex-col max-h-[92dvh]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#2D6A4F] rounded-xl flex items-center justify-center">
              <Package size={15} className="text-white" />
            </div>
            <h2 className="text-lg font-black text-gray-900">Add Product</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X size={15} className="text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-hide relative">
          {/* Overlay loader when fetching API data */}
          {isFetchingInfo && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-[#2D6A4F] mb-2" size={32} />
              <p className="text-sm font-bold text-gray-700">Loading Product Data...</p>
            </div>
          )}

          <Field label="Product Name *">
            <input
              autoFocus
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Tata Salt"
              className={INPUT}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Category *">
              <select value={form.category} onChange={(e) => set("category", e.target.value)} className={INPUT}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__new__">+ New Category</option>
              </select>
            </Field>
            {form.category === "__new__" ? (
              <Field label="New Category Name">
                <input value={form.customCategory} onChange={(e) => set("customCategory", e.target.value)} placeholder="e.g. Pulses" className={INPUT} />
              </Field>
            ) : (
              <Field label="Sub-Category">
                <input value={form.subCategory} onChange={(e) => set("subCategory", e.target.value)} placeholder="e.g. Iodised" className={INPUT} />
              </Field>
            )}
          </div>

          {/* ── Updated Barcode Field with Scan Button ── */}
          <Field label="Barcode / SKU">
            <div className="flex gap-2">
              <input 
                value={form.barcode} 
                onChange={(e) => set("barcode", e.target.value)} 
                placeholder="Scan or type barcode" 
                className={`${INPUT} mono flex-1`} 
              />
              <button
                onClick={() => setIsScanning(true)}
                className="w-10 h-9 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0 text-gray-700 hover:text-[#2D6A4F]"
                title="Scan Barcode"
              >
                <ScanLine size={18} />
              </button>
            </div>
          </Field>

          <Field label="Unit *">
            <select value={form.unit} onChange={(e) => set("unit", e.target.value)} className={INPUT}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Selling Price (₹) *">
              <input type="number" min={0} value={form.sellingPrice} onChange={(e) => set("sellingPrice", e.target.value)} placeholder="0" className={INPUT} />
            </Field>
            <Field label="Cost Price (₹)">
              <input type="number" min={0} value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} placeholder="0" className={INPUT} />
            </Field>
          </div>

          <Field label="GST Rate">
            <div className="flex gap-2">
              {GST_RATES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => set("gstRate", String(r))}
                  className={`flex-1 py-2 rounded-xl border text-xs font-black transition-all ${
                    form.gstRate === String(r)
                      ? "bg-[#2D6A4F] border-[#2D6A4F] text-white"
                      : "bg-[#F7F6F3] border-[#E8E5DF] text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {r}%
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Opening Stock *">
              <input type="number" min={0} value={form.stockQuantity} onChange={(e) => set("stockQuantity", e.target.value)} placeholder="0" className={INPUT} />
            </Field>
            <Field label="Low Stock Alert">
              <input type="number" min={0} value={form.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value)} placeholder="5" className={INPUT} />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional notes about this product…"
              rows={2}
              className={`${INPUT} resize-none h-auto py-2`}
            />
          </Field>

          <div className="h-20" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-5 py-4 bg-white border-t border-gray-100">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-12 bg-[#2D6A4F] hover:bg-[#1B4332] disabled:opacity-60 text-white font-black rounded-2xl transition-all text-sm tracking-wide shadow-lg shadow-[#2D6A4F]/25 active:scale-[0.98]"
          >
            {isSubmitting ? "Adding…" : "Add Product to Inventory"}
          </button>
        </div>
      </motion.div>

      {/* ── Scanner UI Modal ── */}
      <AnimatePresence>
        {isScanning && (
          <BarcodeScannerUI 
            onClose={() => setIsScanning(false)} 
            onDetected={handleBarcodeDetected} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Tiny Helpers ─────────────────────────────────────────────────────────────

const INPUT = "w-full h-9 px-3 bg-[#F7F6F3] border border-[#E8E5DF] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2D6A4F]/20 focus:border-[#2D6A4F]/50 transition-all text-gray-900";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

// ── ZXING-WASM Scanner Component ─────────────────────────────────────────────

// ── ZXING-WASM Scanner Component ─────────────────────────────────────────────

function BarcodeScannerUI({ onClose, onDetected }: { onClose: () => void, onDetected: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let scanInterval: NodeJS.Timeout;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Processing loop
        scanInterval = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === 4) {
            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext("2d");

            if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0);
              canvas.toBlob(async (blob) => {
                if (blob) {
                  const file = new File([blob], "frame.jpg", { type: "image/jpeg" });
                  try {
                    const results = await readBarcodesFromImageFile(file, {
                      // FIX 1: Removed underscores from barcode formats to satisfy TypeScript
                      formats: ["EAN13", "Code128", "EAN8", "UPCA"],
                      tryHarder: false,
                    });
                    if (results && results.length > 0) {
                      clearInterval(scanInterval); 
                      onDetected(results[0].text);
                    }
                  } catch (err) {
                    // zxing throws if no barcode is found in the frame, ignore
                  }
                }
              }, "image/jpeg", 0.7);
            }
          }
        }, 300); 

      } catch (err) {
        toast.error("Camera access denied or unavailable.");
        onClose();
      }
    };

    startCamera();

    return () => {
      clearInterval(scanInterval);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [onClose, onDetected]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      // FIX 2: Changed z-[60] to z-60
      className="fixed inset-0 z-60 bg-black flex flex-col"
    >
      {/* FIX 3: Changed bg-gradient-to-b to bg-linear-to-b */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-linear-to-b from-black/80 to-transparent">
        <h3 className="text-white font-bold tracking-wide">Scan Product Barcode</h3>
        <button onClick={onClose} className="p-2 bg-white/20 rounded-full text-white backdrop-blur-sm">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="absolute inset-0 w-full h-full object-cover" 
        />
        
        <div className="relative w-64 h-40 border-2 border-[#2D6A4F] rounded-xl overflow-hidden shadow-[0_0_0_4000px_rgba(0,0,0,0.6)]">
           <motion.div 
             animate={{ top: ["0%", "100%", "0%"] }}
             transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
             className="absolute left-0 right-0 h-0.5 bg-[#2D6A4F] shadow-[0_0_10px_#2D6A4F]"
           />
        </div>
      </div>
      
      <div className="p-6 pb-10 bg-black text-center text-gray-400 text-sm">
        Align the barcode within the frame to automatically scan and fetch product details.
      </div>
    </motion.div>
  );
}