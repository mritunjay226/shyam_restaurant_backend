"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, DoorOpen, UtensilsCrossed, Coffee,
  PartyPopper, Receipt, BarChart3, Settings,
  LogOut, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/rooms", label: "Rooms", icon: DoorOpen },
    ]
  },
  {
    label: "Food & Events",
    items: [
      { href: "/restaurant", label: "Restaurant", icon: UtensilsCrossed },
      { href: "/cafe", label: "Café", icon: Coffee },
      { href: "/kitchen", label: "Kitchen KDS", icon: UtensilsCrossed },
      { href: "/banquet", label: "Banquet & Events", icon: PartyPopper },
    ]
  },
  {
    label: "Finance",
    items: [
      { href: "/billing", label: "Billing", icon: Receipt },
      { href: "/reports", label: "Reports", icon: BarChart3 },
    ]
  },
  {
    label: null,
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
    ]
  }
];

export function SidebarContent({ isMobile = false }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { staff, logout } = useAuth();
  const roleConfigs = useQuery(api.auth.getRolePermissions) || [];
  
  const userAllowedPaths = roleConfigs.find(c => c.role === staff?.role)?.allowedPaths || ["/"];


  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return (
    <div className="flex flex-col h-full bg-white animate-pulse">
      <div className="flex items-center gap-3 px-5 h-[64px] border-b border-gray-100 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gray-100" />
        <div className="space-y-1">
          <div className="h-4 w-24 bg-gray-100 rounded" />
          <div className="h-2 w-16 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="flex-1 p-4 space-y-4">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-gray-50 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-[64px] border-b border-gray-100 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm tracking-wide shrink-0 shadow-sm">
          SH
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-gray-900">Shyam Hotel</p>
          <p className="text-[10px] text-gray-400 font-medium">Prayagraj</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4 scrollbar-hide">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-3 mb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items
                .filter(item => userAllowedPaths.includes(item.href) || staff?.role === "admin")
                .map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl transition-all duration-150 group",
                      isActive
                        ? "bg-primary text-gray-100 shadow-sm"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <item.icon size={18} className={cn(isActive ? "text-gray-100" : "text-gray-400 group-hover:text-gray-700")} />
                    <span className={cn("text-sm font-medium flex-1", isActive && "font-semibold")}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100">
        <div onClick={logout} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0 group-hover:bg-rose-100 group-hover:text-rose-700 transition-colors">
            {staff?.name.substring(0, 2).toUpperCase() || "??"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-rose-700">{staff?.name || "Loading..."}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 truncate group-hover:text-rose-400">{staff?.role || "Staff"}</p>
          </div>
          <LogOut size={16} className="text-gray-300 group-hover:text-rose-500 transition-colors shrink-0" />
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-[240px] fixed inset-y-0 z-50 border-r border-gray-100 bg-white shadow-sm">
      <SidebarContent />
    </aside>
  );
}
