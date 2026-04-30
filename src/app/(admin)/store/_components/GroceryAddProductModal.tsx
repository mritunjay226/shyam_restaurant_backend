"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, ScanLine, Loader2, Flashlight, FlashlightOff } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { toast } from "sonner";

const UNITS = ["kg", "g", "litre", "ml", "piece", "packet", "dozen", "bundle", "box", "can", "bottle", "spray", "tube", "sachet", "strip", "pair"];
const GST_RATES = [0, 5, 12, 18, 28];

// ── GST inference ─────────────────────────────────────────────────
function inferGstRate(categoryTags: string[] = []): number {
  const tags = categoryTags.join(" ").toLowerCase();
  if (tags.includes("beverage") || tags.includes("drink") || tags.includes("aerated")) return 12;
  if (tags.includes("snack") || tags.includes("chocolate") || tags.includes("confection")) return 18;
  if (tags.includes("dairy") || tags.includes("milk") || tags.includes("curd")) return 5;
  if (tags.includes("grain") || tags.includes("cereal") || tags.includes("rice") || tags.includes("wheat") || tags.includes("flour")) return 0;
  if (tags.includes("oil") || tags.includes("fat")) return 5;
  if (tags.includes("spice") || tags.includes("condiment") || tags.includes("sauce")) return 12;
  if (tags.includes("cosmetic") || tags.includes("beauty") || tags.includes("skin") || tags.includes("hair")) return 18;
  if (tags.includes("detergent") || tags.includes("cleaning") || tags.includes("household")) return 18;
  if (tags.includes("medicine") || tags.includes("pharmaceutical") || tags.includes("drug")) return 12;
  return 0;
}

// ── Unit parser ───────────────────────────────────────────────────
function parseUnit(qtyString: string): string | null {
  if (!qtyString) return null;
  const lower = qtyString.toLowerCase();
  for (const u of UNITS) {
    if (lower.includes(u)) return u;
  }
  if (lower.includes(" l") && /\d/.test(lower)) return "litre";
  if (lower.includes("gm")) return "g";
  if (lower.includes("ml")) return "ml";
  return null;
}

// ── Normalized product shape from any source ──────────────────────
interface NormalizedProduct {
  name: string;
  brandName: string;
  manufacturer: string;
  ingredients: string;
  countryOfOrigin: string;
  packagingType: string;
  image: string;
  unit: string;
  gstRate: number;
  description: string;
  isVegetarian: boolean;
  isVegan: boolean;
  isOrganic: boolean;
  category: string;
  productType: "food" | "beauty" | "household" | "general";
}

// ── OFF-family fields we actually need (used for ?fields= param) ──
const OFF_FIELDS = [
  "product_name", "product_name_en", "brands", "manufacturing_places",
  "producer", "ingredients_text", "countries", "packaging", "image_front_url",
  "quantity", "categories_tags", "labels_tags", "generic_name", "categories",
  "stores", "origins", "allergens_tags", "nutriments"
].join(",");

// ── Source 1 & 2 & 3: Open Food/Beauty/Products Facts (same API, diff domain) ──
async function fetchFromOpenFacts(
  domain: string,
  barcode: string
): Promise<NormalizedProduct | null> {
  try {
    const res = await fetch(
      `https://${domain}/api/v2/product/${barcode}.json?fields=${OFF_FIELDS}`
    );
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    const labels: string[] = p.labels_tags || [];
    const categoryTags: string[] = p.categories_tags || [];

    const productType: NormalizedProduct["productType"] =
      domain.includes("beauty")
        ? "beauty"
        : domain.includes("products")
        ? "household"
        : "food";

    return {
      name: p.product_name || p.product_name_en || "",
      brandName: p.brands?.split(",")[0]?.trim() || "",
      manufacturer: p.manufacturing_places || p.producer || "",
      ingredients: p.ingredients_text || "",
      countryOfOrigin: p.countries?.split(",")[0]?.trim() || p.origins?.split(",")[0]?.trim() || "",
      packagingType: p.packaging?.split(",")[0]?.trim() || "",
      image: p.image_front_url || "",
      unit: parseUnit(p.quantity || "") || "piece",
      gstRate: inferGstRate(categoryTags),
      description: p.generic_name || "",
      isVegetarian: labels.some((l) => l.includes("vegetarian")),
      isVegan: labels.some((l) => l.includes("vegan")),
      isOrganic: labels.some((l) => l.includes("organic")),
      category: (p.categories || "").split(",")[0]?.trim() || "",
      productType,
    };
  } catch {
    return null;
  }
}

// ── Source 4: UPCitemdb (no signup, 100 req/day free) ─────────────
async function fetchFromUPCitemdb(barcode: string): Promise<NormalizedProduct | null> {
  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`
    );
    const data = await res.json();
    if (data.code !== "OK" || !data.items?.length) return null;

    const item = data.items[0];
    // upcitemdb gives: title, brand, description, category, images[], weight, dimension, color, size, manufacturer
    return {
      name: item.title || "",
      brandName: item.brand || "",
      manufacturer: item.manufacturer || "",
      ingredients: "",
      countryOfOrigin: "",
      packagingType: "",
      image: item.images?.[0] || "",
      unit: parseUnit(item.size || item.weight || "") || "piece",
      gstRate: 18, // conservative default for non-food items
      description: item.description || item.category || "",
      isVegetarian: false,
      isVegan: false,
      isOrganic: false,
      category: item.category || "",
      productType: "general",
    };
  } catch {
    return null;
  }
}

// ── Master waterfall: tries all 4 sources in order ────────────────
async function waterfallLookup(
  barcode: string,
  onProgress: (msg: string) => void
): Promise<{ product: NormalizedProduct; source: string } | null> {
  const sources: Array<{ label: string; fn: () => Promise<NormalizedProduct | null> }> = [
    {
      label: "Open Food Facts",
      fn: () => fetchFromOpenFacts("world.openfoodfacts.org", barcode),
    },
    {
      label: "Open Beauty Facts",
      fn: () => fetchFromOpenFacts("world.openbeautyfacts.org", barcode),
    },
    {
      label: "Open Products Facts",
      fn: () => fetchFromOpenFacts("world.openproductsfacts.org", barcode),
    },
    {
      label: "UPCitemdb",
      fn: () => fetchFromUPCitemdb(barcode),
    },
  ];

  for (const source of sources) {
    onProgress(`Checking ${source.label}...`);
    const result = await source.fn();
    if (result && result.name) {
      return { product: result, source: source.label };
    }
  }

  return null;
}

// ── Form state type ───────────────────────────────────────────────
interface FormState {
  name: string;
  category: string;
  customCategory: string;
  subCategory: string;
  barcode: string;
  unit: string;
  sellingPrice: string;
  costPrice: string;
  gstRate: string;
  stockQuantity: string;
  lowStockThreshold: string;
  description: string;
  brandName: string;
  manufacturer: string;
  ingredients: string;
  isVegetarian: boolean;
  isVegan: boolean;
  isOrganic: boolean;
  countryOfOrigin: string;
  packagingType: string;
  image: string;
}

interface GroceryAddProductModalProps {
  categories: string[];
  onClose: () => void;
}

export function GroceryAddProductModal({ categories, onClose }: GroceryAddProductModalProps) {
  const addProduct = useMutation(api.grocery.addGroceryProduct);
  // mutation to cache barcode lookups so second scan of same barcode is instant
  const cacheBarcodeProduct = useMutation(api.grocery.cacheBarcodeProduct);

  const [form, setForm] = useState<FormState>({
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
    brandName: "",
    manufacturer: "",
    ingredients: "",
    isVegetarian: false,
    isVegan: false,
    isOrganic: false,
    countryOfOrigin: "",
    packagingType: "",
    image: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [fetchProgress, setFetchProgress] = useState("Fetching product details...");
  const [dataSource, setDataSource] = useState<string | null>(null);
  const [showExtra, setShowExtra] = useState(false);

  const set = (key: keyof FormState, val: string | boolean) =>
    setForm((f) => ({ ...f, [key]: val }));

  // ── Apply normalized product to form ──────────────────────────────
  const applyProduct = (p: NormalizedProduct, barcode: string) => {
    // Try to match API category to an existing local category
    const matchedCategory =
      categories.find(
        (c) =>
          c.toLowerCase() === p.category.toLowerCase() ||
          p.category.toLowerCase().includes(c.toLowerCase())
      ) ?? form.category;

    setForm((prev) => ({
      ...prev,
      name: p.name || prev.name,
      brandName: p.brandName || prev.brandName,
      manufacturer: p.manufacturer || prev.manufacturer,
      ingredients: p.ingredients || prev.ingredients,
      countryOfOrigin: p.countryOfOrigin || prev.countryOfOrigin,
      packagingType: p.packagingType || prev.packagingType,
      image: p.image || prev.image,
      unit: p.unit !== "piece" ? p.unit : prev.unit,
      gstRate: String(p.gstRate),
      category: matchedCategory,
      description: p.description || prev.description,
      isVegetarian: p.isVegetarian,
      isVegan: p.isVegan,
      isOrganic: p.isOrganic,
      barcode,
    }));

    setShowExtra(true);
  };

  // ── Main barcode handler ──────────────────────────────────────────
  const handleBarcodeDetected = async (code: string) => {
    setIsScanning(false);
    set("barcode", code);
    setIsFetchingInfo(true);
    setDataSource(null);
    toast.loading("Fetching product details...", { id: "fetch-product" });

    const result = await waterfallLookup(code, (msg) => {
      setFetchProgress(msg);
      toast.loading(msg, { id: "fetch-product" });
    });

    if (result) {
      toast.success(`Found on ${result.source}!`, { id: "fetch-product" });
      setDataSource(result.source);
      applyProduct(result.product, code);

      // ── Cache to Convex DB so repeat scans are instant ────────────
      // (fire and forget — don't block UI)
      cacheBarcodeProduct?.({
        barcode: code,
        source: result.source,
        name: result.product.name,
        brandName: result.product.brandName || undefined,
        manufacturer: result.product.manufacturer || undefined,
        ingredients: result.product.ingredients || undefined,
        countryOfOrigin: result.product.countryOfOrigin || undefined,
        packagingType: result.product.packagingType || undefined,
        image: result.product.image || undefined,
        unit: result.product.unit,
        description: result.product.description || undefined,
        isVegetarian: result.product.isVegetarian || undefined,
        isVegan: result.product.isVegan || undefined,
        isOrganic: result.product.isOrganic || undefined,
        productType: result.product.productType,
      }).catch(() => {
        // silent — cache failure shouldn't affect UX
      });
    } else {
      toast.info(
        "Not found in any database. Please fill manually.",
        { id: "fetch-product" }
      );
    }

    setIsFetchingInfo(false);
    setFetchProgress("Fetching product details...");
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Product name required"); return; }
    if (!form.stockQuantity || parseFloat(form.stockQuantity) < 0) { toast.error("Enter a valid stock quantity"); return; }

    setIsSubmitting(true);
    try {
      await addProduct({
        name: form.name.trim(),
        category: form.category === "__new__" ? form.customCategory.trim() : form.category,
        subCategory: form.subCategory.trim() || undefined,
        barcode: form.barcode.trim() || undefined,
        unit: form.unit,
        sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : undefined,
        costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
        gstRate: parseInt(form.gstRate),
        stockQuantity: parseFloat(form.stockQuantity),
        lowStockThreshold: parseFloat(form.lowStockThreshold) || 5,
        description: form.description.trim() || undefined,
        image: form.image.trim() || undefined,
        isActive: true,
        brandName: form.brandName.trim() || undefined,
        manufacturer: form.manufacturer.trim() || undefined,
        ingredients: form.ingredients.trim() || undefined,
        countryOfOrigin: form.countryOfOrigin.trim() || undefined,
        packagingType: form.packagingType.trim() || undefined,
        isVegetarian: form.isVegetarian || undefined,
        isVegan: form.isVegan || undefined,
        isOrganic: form.isOrganic || undefined,
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
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X size={15} className="text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-hide relative">
          {/* Fetching overlay */}
          {isFetchingInfo && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[3px] z-10 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-[#2D6A4F]" size={36} />
              <p className="text-sm font-bold text-gray-700">{fetchProgress}</p>
              <div className="flex gap-1.5">
                {["Open Food Facts", "Open Beauty Facts", "Open Products Facts", "UPCitemdb"].map((src) => (
                  <div
                    key={src}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      fetchProgress.includes(src)
                        ? "w-6 bg-[#2D6A4F]"
                        : "w-1.5 bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-gray-400 font-medium">Searching 4 databases…</p>
            </div>
          )}

          {/* Product preview card (after autofill) */}
          {form.image && !isFetchingInfo && (
            <div className="flex items-center gap-3 p-3 bg-[#F7F6F3] rounded-2xl border border-[#E8E5DF]">
              <img
                src={form.image}
                alt="product"
                className="w-14 h-14 rounded-xl object-cover border border-gray-200 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    Auto-filled
                  </p>
                  {dataSource && (
                    <span className="text-[9px] font-black bg-[#2D6A4F]/10 text-[#2D6A4F] px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                      {dataSource}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-gray-700 truncate">{form.name}</p>
                {form.brandName && (
                  <p className="text-xs text-gray-400">{form.brandName}</p>
                )}
              </div>
            </div>
          )}

          {/* No image but data found */}
          {!form.image && dataSource && !isFetchingInfo && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#2D6A4F]/8 rounded-xl border border-[#2D6A4F]/20">
              <div className="w-2 h-2 rounded-full bg-[#2D6A4F] shrink-0" />
              <p className="text-xs font-bold text-[#2D6A4F]">
                Data auto-filled from {dataSource}
              </p>
            </div>
          )}

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

          <div className="grid grid-cols-2 gap-2">
            <Field label="Category *">
              <select value={form.category} onChange={(e) => set("category", e.target.value)} className={INPUT}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__new__">+ New Category</option>
              </select>
            </Field>
            {form.category === "__new__" ? (
              <Field label="New Category Name">
                <input
                  value={form.customCategory}
                  onChange={(e) => set("customCategory", e.target.value)}
                  placeholder="e.g. Pulses"
                  className={INPUT}
                />
              </Field>
            ) : (
              <Field label="Sub-Category">
                <input
                  value={form.subCategory}
                  onChange={(e) => set("subCategory", e.target.value)}
                  placeholder="e.g. Iodised"
                  className={INPUT}
                />
              </Field>
            )}
          </div>

          <Field label="Barcode / SKU">
            <div className="flex gap-2">
              <input
                value={form.barcode}
                onChange={(e) => set("barcode", e.target.value)}
                placeholder="Scan or type barcode"
                className={`${INPUT} font-mono flex-1`}
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
            <Field label="Selling Price (₹)">
              <input
                type="number"
                min={0}
                value={form.sellingPrice}
                onChange={(e) => set("sellingPrice", e.target.value)}
                placeholder="0 (Optional)"
                className={INPUT}
              />
            </Field>
            <Field label="Cost Price (₹)">
              <input
                type="number"
                min={0}
                value={form.costPrice}
                onChange={(e) => set("costPrice", e.target.value)}
                placeholder="0 (Optional)"
                className={INPUT}
              />
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
              <input
                type="number"
                min={0}
                value={form.stockQuantity}
                onChange={(e) => set("stockQuantity", e.target.value)}
                placeholder="0"
                className={INPUT}
              />
            </Field>
            <Field label="Low Stock Alert">
              <input
                type="number"
                min={0}
                value={form.lowStockThreshold}
                onChange={(e) => set("lowStockThreshold", e.target.value)}
                placeholder="5"
                className={INPUT}
              />
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

          {/* Toggle additional details */}
          <button
            type="button"
            onClick={() => setShowExtra((v) => !v)}
            className="w-full text-xs font-black text-[#2D6A4F] uppercase tracking-widest py-2 flex items-center justify-center gap-1 hover:opacity-70 transition-opacity"
          >
            {showExtra ? "▲ Hide" : "▼ Show"} Additional Details
          </button>

          <AnimatePresence>
            {showExtra && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Brand Name">
                    <input
                      value={form.brandName}
                      onChange={(e) => set("brandName", e.target.value)}
                      placeholder="e.g. Amul"
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Manufacturer">
                    <input
                      value={form.manufacturer}
                      onChange={(e) => set("manufacturer", e.target.value)}
                      placeholder="e.g. Gujarat Co-op"
                      className={INPUT}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Country of Origin">
                    <input
                      value={form.countryOfOrigin}
                      onChange={(e) => set("countryOfOrigin", e.target.value)}
                      placeholder="e.g. India"
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Packaging Type">
                    <input
                      value={form.packagingType}
                      onChange={(e) => set("packagingType", e.target.value)}
                      placeholder="e.g. Packet"
                      className={INPUT}
                    />
                  </Field>
                </div>

                <Field label="Ingredients">
                  <textarea
                    value={form.ingredients}
                    onChange={(e) => set("ingredients", e.target.value)}
                    placeholder="e.g. Wheat flour, salt, water…"
                    rows={2}
                    className={`${INPUT} resize-none h-auto py-2`}
                  />
                </Field>

                <Field label="Product Image URL">
                  <input
                    value={form.image}
                    onChange={(e) => set("image", e.target.value)}
                    placeholder="https://…"
                    className={INPUT}
                  />
                </Field>

                {/* Label Badges */}
                <Field label="Product Labels">
                  <div className="flex gap-2 flex-wrap">
                    {(["isVegetarian", "isVegan", "isOrganic"] as const).map((key) => {
                      const labels: Record<string, string> = {
                        isVegetarian: "🟢 Vegetarian",
                        isVegan: "🌿 Vegan",
                        isOrganic: "🌾 Organic",
                      };
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => set(key, !form[key])}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all ${
                            form[key]
                              ? "bg-[#2D6A4F] border-[#2D6A4F] text-white"
                              : "bg-[#F7F6F3] border-[#E8E5DF] text-gray-500"
                          }`}
                        >
                          {labels[key]}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </motion.div>
            )}
          </AnimatePresence>

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

// ── Barcode Scanner UI (with flashlight) ──────────────────────────

function BarcodeScannerUI({
  onClose,
  onDetected,
}: {
  onClose: () => void;
  onDetected: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let scanInterval: NodeJS.Timeout;
    let isProcessing = false;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;

        const track = stream.getVideoTracks()[0];
        trackRef.current = track;

        const capabilities = track.getCapabilities
          ? (track.getCapabilities() as any)
          : {};
        if (capabilities.torch) setHasTorch(true);

        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve(true);
          }
        });

        // Path A: Native BarcodeDetector (Android Chrome)
        if ("BarcodeDetector" in window) {
          // @ts-ignore
          const detector = new window.BarcodeDetector({
            formats: ["ean_13", "code_128", "upc_a", "ean_8"],
          });

          scanInterval = setInterval(async () => {
            if (isProcessing || !videoRef.current) return;
            isProcessing = true;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                clearInterval(scanInterval);
                onDetected(barcodes[0].rawValue);
              }
            } catch {}
            finally { isProcessing = false; }
          }, 100);
        }
        // Path B: WASM fallback (iOS Safari, desktop)
        else {
          const { readBarcodesFromImageData } = await import("zxing-wasm/reader");

          scanInterval = setInterval(async () => {
            if (isProcessing || !videoRef.current || videoRef.current.readyState !== 4) return;
            isProcessing = true;

            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });

            if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              try {
                const results = await readBarcodesFromImageData(imageData, {
                  formats: ["EAN13", "Code128", "EAN8", "UPCA"],
                  tryHarder: false,
                });
                if (results?.length > 0) {
                  clearInterval(scanInterval);
                  onDetected(results[0].text);
                }
              } catch {}
            }
            isProcessing = false;
          }, 150);
        }
      } catch {
        toast.error("Camera access denied or unavailable.");
        onClose();
      }
    };

    startCamera();

    return () => {
      clearInterval(scanInterval);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onClose, onDetected]);

  const toggleTorch = async () => {
    if (!trackRef.current) return;
    try {
      const next = !isTorchOn;
      await trackRef.current.applyConstraints({
        advanced: [{ torch: next } as any],
      });
      setIsTorchOn(next);
    } catch {
      toast.error("Could not toggle flashlight.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-60 bg-black flex flex-col"
    >
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-linear-to-b from-black/80 to-transparent">
        <h3 className="text-white font-bold tracking-wide">Scan Product Barcode</h3>
        <div className="flex items-center gap-3">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
                isTorchOn
                  ? "bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.5)]"
                  : "bg-white/20 text-white"
              }`}
            >
              {isTorchOn ? <Flashlight size={20} /> : <FlashlightOff size={20} />}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 bg-white/20 rounded-full text-white backdrop-blur-sm hover:bg-white/30 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
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
        Align the barcode within the frame. Auto-detecting...
      </div>
    </motion.div>
  );
}