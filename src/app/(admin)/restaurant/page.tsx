"use client";

import { POSMenu } from "@/components/POSMenu";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function RestaurantPage() {
  const dbItems = useQuery(api.banquetMenu.getMenuItems, {}) || [];
  const dbCategories = useQuery(api.banquetMenu.getCategories, {}) || [];
  const groceryProducts = useQuery(api.grocery.getAllGroceryProducts) || [];

  // Deduplicate categories by name
  const uniqueCategories = dbCategories.reduce((acc, current) => {
    const x = acc.find(item => item.name === current.name);
    if (!x) return acc.concat([current]);
    return acc;
  }, [] as typeof dbCategories);

  // Add "Store Items" category
  const storeCategory = { _id: "store-items", name: "Store Items" };
  const categoriesWithStore = [...uniqueCategories, storeCategory];

  const validCatIds = new Set(uniqueCategories.map(c => c._id));

  // Regular menu items
  const menuItems = dbItems
    .filter(item => validCatIds.has(item.categoryId))
    .map(item => ({
      _id: item._id,
      name: item.name,
      price: item.price,
      categoryId: item.categoryId,
      category: dbCategories.find(c => c._id === item.categoryId)?.name || 'Other',
      dietaryType: item.dietaryType,
      description: item.description,
      image: item.image,
    }));

  // Grocery items mapped to "Store Items" category
  const storeItems = groceryProducts.map(p => ({
    _id: p._id,
    name: p.name,
    price: p.sellingPrice || 0,
    categoryId: "store-items",
    category: "Store Items",
    dietaryType: "veg",
    description: `Stock: ${p.stockQuantity} ${p.unit}`,
    image: p.image,
    unit: p.unit,
  }));

  const allItems = [...menuItems, ...storeItems];

  return (
    <POSMenu
      title="Restaurant"
      items={allItems}
      categories={categoriesWithStore}
      accentColorClass="bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20"
      accentBorderClass="border-emerald-200"
      accentTextClass="text-emerald-600"
      outlet="restaurant"
    />
  );
}
