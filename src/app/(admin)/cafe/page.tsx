"use client";

import { POSMenu } from "@/components/POSMenu";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function CafePage() {
  const dbItems = useQuery(api.banquetMenu.getMenuItems, {}) || [];
  const dbCategories = useQuery(api.banquetMenu.getCategories, {}) || [];

  // Deduplicate categories by name
  const uniqueCategories = dbCategories.reduce((acc, current) => {
    const x = acc.find(item => item.name === current.name);
    if (!x) return acc.concat([current]);
    return acc;
  }, [] as typeof dbCategories);

  const validCatIds = new Set(uniqueCategories.map(c => c._id));

  // All items — inject category name for POSMenu compatibility
  const items = dbItems
    .filter(item => validCatIds.has(item.categoryId))
    .map(item => ({
      ...item,
      category: dbCategories.find(c => c._id === item.categoryId)?.name || 'Other'
    }));

  return (
    <POSMenu 
      title="Café" 
      items={items}
      categories={uniqueCategories}
      accentColorClass="bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/20"
      accentBorderClass="border-teal-200"
      accentTextClass="text-teal-600"
      outlet="cafe"
    />
  );
}
