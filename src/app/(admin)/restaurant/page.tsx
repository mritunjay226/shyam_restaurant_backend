"use client";

import { POSMenu } from "@/components/POSMenu";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function RestaurantPage() {
  const dbItems = useQuery(api.banquetMenu.getMenuItems, {}) || [];
  const dbCategories = useQuery(api.banquetMenu.getCategories, {}) || [];

  const RESTAURANT_CAT_NAMES = [
    'Other Starters', 'Pasta', 'Pizzeria', 'Garlic Bread', 
    'Noodles', 'Rice', 'Chinese Main Course', 'Sides', 
    'Soup Bowls', 'Tandoori Snacks', 'Indian Main Course', 
    'Indian Breads', 'Salads & Raita'
  ];

  // Filter categories that belong to Restaurant and Deduplicate by name
  const restaurantCategories = dbCategories
    .filter(c => RESTAURANT_CAT_NAMES.includes(c.name))
    .reduce((acc, current) => {
      const x = acc.find(item => item.name === current.name);
      if (!x) return acc.concat([current]);
      return acc;
    }, [] as typeof dbCategories);

  const restCatIds = new Set(restaurantCategories.map(c => c._id));

  // Filter items and inject category name for POSMenu compatibility
  const items = dbItems
    .filter(item => restCatIds.has(item.categoryId))
    .map(item => ({
      ...item,
      category: dbCategories.find(c => c._id === item.categoryId)?.name || 'Other'
    }));

  return (
    <POSMenu
      title="Restaurant"
      items={items}
      categories={restaurantCategories}
      accentColorClass="bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20"
      accentBorderClass="border-emerald-200"
      accentTextClass="text-emerald-600"
      outlet="restaurant"
    />
  );
}
