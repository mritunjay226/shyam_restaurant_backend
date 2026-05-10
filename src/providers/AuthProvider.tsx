"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { useRouter, usePathname } from "next/navigation";
import AuthModal from "@/components/AuthModal";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const IDLE_WARNING_MS = 14 * 60 * 1000; // warn at 14 min (1 min remaining)

interface AuthContextType {
  token: string | null;
  staff: Doc<"staff"> | null;
  isLoading: boolean;
  login: (pin: string, staffId?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  staff: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  const loginMutation = useMutation(api.auth.loginWithPin);
  const logoutMutation = useMutation(api.auth.logout);

  // ── Load token from localStorage ──────────────────────────────
  useEffect(() => {
    const storedToken = localStorage.getItem("staff_session_token");
    if (storedToken) setToken(storedToken);
    setIsInitializing(false);
  }, []);

  // ── Validate session via Convex ───────────────────────────────
  const staff = useQuery(api.auth.validateSession, token ? { token } : "skip");
  const isQueryLoading = token !== null && staff === undefined;
  const isLoading = isInitializing || isQueryLoading;

  // ── Redirect from legacy /login page only ─────────────────────
  useEffect(() => {
    if (isLoading) return;
    if (staff && pathname === "/login") {
      const redirectMap: Record<string, string> = {
        admin: "/",
        manager: "/",
        kitchen: "/kitchen",
        reception: "/rooms",
      };
      router.push(redirectMap[staff.role] || "/");
    }
  }, [staff, isLoading, pathname, router]);

  // ── Auth actions ──────────────────────────────────────────────
  const login = async (pin: string, staffId?: string) => {
    const data = await loginMutation({ pin, staffId: staffId as any });
    localStorage.setItem("staff_session_token", data.token);
    setToken(data.token);
  };

  const logout = async () => {
    if (token) {
      try { await logoutMutation({ token }); } catch (_) {}
    }
    localStorage.removeItem("staff_session_token");
    setToken(null);
  };

  // ── Loading screen ────────────────────────────────────────────
  if (isLoading) {
    return (
      <AuthContext.Provider value={{ token, staff: staff || null, isLoading, login, logout }}>
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-gray-900/40 backdrop-blur-3xl">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest animate-pulse">
              Loading…
            </p>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ token, staff: staff || null, isLoading, login, logout }}>
      {/* Always render children to keep the DOM mounted — avoids layout flash */}
      <div className={staff ? undefined : "invisible pointer-events-none select-none"}>
        {children}
      </div>

      {!staff && <AuthModal />}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
