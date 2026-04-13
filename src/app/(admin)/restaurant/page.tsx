"use client";

import { POSMenu } from "@/components/POSMenu";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

const categories = ["Starters", "Main Course", "Breads", "Desserts", "Beverages"];

export default function RestaurantPage() {
  const items = useQuery(api.menuItems.getMenuByOutlet, { outlet: "restaurant" }) || [];
  return (
    <POSMenu
      title="Restaurant"
      items={items}
      categories={categories}
      accentColorClass="bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20"
      accentBorderClass="border-emerald-200"
      accentTextClass="text-emerald-600"
      outlet="restaurant"
    />
  );
}
