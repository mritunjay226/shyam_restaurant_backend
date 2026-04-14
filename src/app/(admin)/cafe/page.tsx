"use client";

import { POSMenu } from "@/components/POSMenu";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function CafePage() {
  const dbItems = useQuery(api.banquetMenu.getMenuItems, {}) || [];
  const dbCategories = useQuery(api.banquetMenu.getCategories, {}) || [];

  const CAFE_CAT_NAMES = [
    'Coffee', 'Teas', 'Mocktail', 'Cold Brews', 
    'Breakfast', 'Snacks', 'Maggi', 'Burgers / Sandwiches', 
    'Mithai & Meetha', 'Ice Cream & Sundaes', 'Bakery'
  ];

  // Filter categories that belong to Cafe and Deduplicate by name
  const cafeCategories = dbCategories
    .filter(c => CAFE_CAT_NAMES.includes(c.name))
    .reduce((acc, current) => {
      const x = acc.find(item => item.name === current.name);
      if (!x) return acc.concat([current]);
      return acc;
    }, [] as typeof dbCategories);

  const cafeCatIds = new Set(cafeCategories.map(c => c._id));

  // Filter items and inject category name for POSMenu compatibility
  const items = dbItems
    .filter(item => cafeCatIds.has(item.categoryId))
    .map(item => ({
      ...item,
      category: dbCategories.find(c => c._id === item.categoryId)?.name || 'Other'
    }));

  return (
    <POSMenu 
      title="Café"
      items={items}
      categories={cafeCategories}
      accentColorClass="bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/20"
      accentBorderClass="border-teal-200"
      accentTextClass="text-teal-600"
      outlet="cafe"
    />
  );
}
