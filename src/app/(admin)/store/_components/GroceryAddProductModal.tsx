"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Package } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { toast } from "sonner";

// ── Form state type ───────────────────────────────────────────────
interface FormState {
  name: string;
  category: string;
  stockQuantity: string;
}

interface GroceryAddProductModalProps {
  categories: string[];
  onClose: () => void;
}

export function GroceryAddProductModal({ categories, onClose }: GroceryAddProductModalProps) {
  const addProduct = useMutation(api.grocery.addGroceryProduct);

  const [form, setForm] = useState<FormState>({
    name: "",
    category: categories[0] || "General",
    stockQuantity: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const set = (key: keyof FormState, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Product name required");
      return;
    }
    if (!form.stockQuantity || parseFloat(form.stockQuantity) < 0) {
      toast.error("Enter a valid stock quantity");
      return;
    }
    if (isAddingNewCategory && !newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    setIsSubmitting(true);
    try {
      await addProduct({
        name: form.name.trim(),
        category: isAddingNewCategory ? newCategoryName.trim() : form.category,
        stockQuantity: parseFloat(form.stockQuantity),
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pb-14">
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
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#2D6A4F] rounded-xl flex items-center justify-center">
              <Package size={15} className="text-white" />
            </div>
            <h2 className="text-lg font-black text-gray-900">Add Product</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X size={15} className="text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-hide relative">
          {/* ── FORM FIELDS ── */}
          <Field label="Product Name *">
            <input
              autoFocus
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Tata Salt"
              className={INPUT}
            />
          </Field>

          <Field label="Category *">
            {!isAddingNewCategory ? (
              <div className="flex gap-2">
                <select
                  value={form.category}
                  onChange={(e) => {
                    if (e.target.value === "__NEW__") {
                      setIsAddingNewCategory(true);
                    } else {
                      set("category", e.target.value);
                    }
                  }}
                  className={INPUT}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  {!categories.includes("General") && (
                    <option value="General">General</option>
                  )}
                  <option value="__NEW__">+ Add New Category</option>
                </select>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                  className={INPUT}
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNewCategory(false);
                    setNewCategoryName("");
                  }}
                  className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-colors shrink-0"
                >
                  Cancel
                </button>
              </div>
            )}
          </Field>

          <Field label="Opening Stock *">
            <input
              type="number"
              min={0}
              value={form.stockQuantity}
              onChange={(e) => set("stockQuantity", e.target.value)}
              placeholder="0"
              className={INPUT}
            />
          </Field>

          <div className="h-20" />
        </div>

        {/* Submit button */}
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
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

const INPUT =
  "w-full h-9 px-3 bg-[#F7F6F3] border border-[#E8E5DF] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2D6A4F]/20 focus:border-[#2D6A4F]/50 transition-all text-gray-900";

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