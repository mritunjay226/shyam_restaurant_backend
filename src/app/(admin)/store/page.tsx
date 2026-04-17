"use client";

// ─────────────────────────────────────────────────────────────────────────────
// /app/(dashboard)/grocery/page.tsx  — drop-in page
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { GroceryPOS } from "./_components/GroceryPOS";

export default function GroceryStorePage() {
  const products = useQuery(api.grocery.getAllGroceryProducts) ?? [];
  const lowStock = useQuery(api.grocery.getLowStockProducts) ?? [];

  const activeProducts = products.filter((p) => p.isActive);

  // Derive unique categories from product data
  const categories = Array.from(
    new Map(activeProducts.map((p) => [p.category, p.category])).entries()
  ).map(([name]) => ({ id: name, name }));

  return (
    <GroceryPOS
      products={activeProducts}
      categories={categories}
      lowStockProducts={lowStock}
    />
  );
}
