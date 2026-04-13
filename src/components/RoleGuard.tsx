"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { staff, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const roleConfigs = useQuery(api.auth.getRolePermissions);
  const isConfigLoading = roleConfigs === undefined;
  
  // Find permissions for current staff role
  const userAllowedPaths = roleConfigs?.find(c => c.role === staff?.role)?.allowedPaths || [];
  
  // Admin bypass
  const isAllowed = staff?.role === "admin" || userAllowedPaths.some(p => pathname === p || (p !== '/' && pathname.startsWith(p)));

  useEffect(() => {
    if (!isLoading && !isConfigLoading && staff) {
      if (!isAllowed) {
        // Find their first allowed path, or fallback to /
        const fallbackPath = userAllowedPaths.length > 0 ? userAllowedPaths[0] : "/";
        router.push(staff.role === "admin" ? "/restaurant" : fallbackPath);
      }
    }
  }, [staff, isLoading, isConfigLoading, isAllowed, router, userAllowedPaths]);

  if (isLoading || isConfigLoading || !staff) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-sm font-bold text-gray-500 tracking-widest uppercase animate-pulse">Authenticating...</p>
      </div>
    );
  }

  if (!isAllowed) {
    return null; // hide content while redirect happens
  }

  return <>{children}</>;
}
