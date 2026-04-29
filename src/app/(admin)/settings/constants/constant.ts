// components/settings/constants.ts

export const ALL_PAGES = [
  { href: "/", label: "Dashboard" },
  { href: "/rooms", label: "Rooms" },
  { href: "/customers", label: "Customers" },
  { href: "/restaurant", label: "Restaurant" },
  { href: "/cafe", label: "Café" },
  { href: "/kitchen", label: "Kitchen KDS" },
  { href: "/store", label: "Store" },
  { href: "/banquet", label: "Banquet & Events" },
  { href: "/billing", label: "Billing" },
  { href: "/billing/history", label: "Billing/history" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

export const BASE_ROLES = ["admin", "manager", "reception", "kitchen"] as const;

export const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  manager: "bg-blue-100 text-blue-700 border-blue-200",
  reception: "bg-teal-100 text-teal-700 border-teal-200",
  kitchen: "bg-orange-100 text-orange-700 border-orange-200",
};

export function getRoleColor(role: string) {
  return ROLE_COLORS[role] || "bg-gray-100 text-gray-700 border-gray-200";
}