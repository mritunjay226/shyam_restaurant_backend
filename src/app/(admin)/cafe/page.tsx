"use client";

import { POSMenu } from "@/components/POSMenu";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

const categories = ['Coffees', 'Teas', 'Snacks', 'Bakery', 'Beverages'];

export default function CafePage() {
  const items = useQuery(api.menuItems.getMenuByOutlet, { outlet: "cafe" }) || [];

  return (
    <POSMenu 
      title="Café"
      items={items}
      categories={categories}
      accentColorClass="bg-rose-600 text-white hover:bg-rose-700 shadow-rose-600/20"
      accentBorderClass="border-rose-200"
      accentTextClass="text-rose-600"
      outlet="cafe"
    />
  );
}
