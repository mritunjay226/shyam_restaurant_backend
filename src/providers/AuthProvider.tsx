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
  idleWarning: boolean;        // true when 1 minute remains before auto-logout
  login: (pin: string, staffId?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  staff: null,
  isLoading: true,
  idleWarning: false,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [idleWarning, setIdleWarning] = useState(false);

  // Refs so idle callbacks always have the latest values without re-subscribing
  const lastActivityRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // ── IDLE AUTO-LOGOUT ──────────────────────────────────────────
  const doLogout = useCallback(async () => {
    const t = localStorage.getItem("staff_session_token");
    if (t) {
      try { await logoutMutation({ token: t }); } catch (_) {}
    }
    localStorage.removeItem("staff_session_token");
    setToken(null);
    setIdleWarning(false);
  }, [logoutMutation]);

  const resetIdleTimers = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIdleWarning(false);

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);

    // Warning at 14 min
    warnTimerRef.current = setTimeout(() => {
      setIdleWarning(true);
    }, IDLE_WARNING_MS);

    // Hard logout at 15 min
    idleTimerRef.current = setTimeout(() => {
      doLogout();
    }, IDLE_TIMEOUT_MS);
  }, [doLogout]);

  // Start/stop idle tracking depending on login state
  useEffect(() => {
    if (!staff) {
      // Not logged in — clear timers, nothing to track
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      setIdleWarning(false);
      return;
    }

    // Activity events that reset the idle timer
    const EVENTS = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    const handleActivity = () => resetIdleTimers();

    EVENTS.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    resetIdleTimers(); // start the timer immediately on login

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, handleActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    };
  }, [staff, resetIdleTimers]);

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
    setIdleWarning(false);
  };

  // ── Loading screen ────────────────────────────────────────────
  if (isLoading) {
    return (
      <AuthContext.Provider value={{ token, staff: staff || null, isLoading, idleWarning, login, logout }}>
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
    <AuthContext.Provider value={{ token, staff: staff || null, isLoading, idleWarning, login, logout }}>
      {/* Always render children to keep the DOM mounted — avoids layout flash */}
      <div className={staff ? undefined : "invisible pointer-events-none select-none"}>
        {children}
      </div>

      {/* Idle warning banner */}
      {staff && idleWarning && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-90 bg-amber-500 text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce-slow">
          <span>⚠️ Inactive — auto-logout in 1 minute.</span>
          <button
            onClick={resetIdleTimers}
            className="bg-white text-amber-600 px-3 py-1 rounded-lg text-xs font-black hover:bg-amber-50 transition-colors"
          >
            Stay
          </button>
        </div>
      )}

      {!staff && <AuthModal />}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
