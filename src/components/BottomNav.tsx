"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, DoorOpen, UtensilsCrossed, PartyPopper, MoreHorizontal, Receipt, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/rooms", label: "Rooms", Icon: DoorOpen },
  { href: "/billing", label: "Billing", Icon: Receipt },
  { href: "/banquet", label: "Events", Icon: PartyPopper },
  { href: "/reports", label: "Reports", Icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)] z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-16 px-1">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center justify-center flex-1 h-full gap-1 min-h-[44px]"
            >
              <div className={cn(
                "w-10 h-8 rounded-xl flex items-center justify-center transition-colors duration-200",
                isActive ? "bg-green-600" : ""
              )}>
                <Icon size={20} className={cn(
                  "transition-colors duration-200",
                  isActive ? "text-white" : "text-gray-400"
                )} />
              </div>
              <span className={cn(
                "text-[10px] font-semibold transition-colors duration-200",
                isActive ? "text-green-600" : "text-gray-400"
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
