"use client";

import { useState, useEffect } from "react";
import { Bell, Menu, Search, Sparkles, X, LogOut, KeyRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { SidebarContent } from "./Sidebar";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Popover, PopoverContent, PopoverTrigger, PopoverHeader, PopoverTitle
} from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import AdminAIChatbot from "@/components/adminAiChatbot";
import { toast } from "sonner";

// ─── Auth hook — reads token from localStorage, validates via Convex ─────────

function useAuthSession() {
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem("staff_session_token") ?? "";
    setToken(stored);
  }, []);

  const staff = useQuery(
    api.auth.validateSession,
    token ? { token } : "skip" as any
  );

  return { token, staff };
}

// ─── Live KOT Updates (unchanged) ───────────────────────────────────────────

function LiveUpdates() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const outlet = pathname?.includes("/cafe")
    ? "cafe"
    : pathname?.includes("/restaurant")
    ? "restaurant"
    : undefined;

  const activeOrders =
    useQuery(
      api.orders.getActiveOrdersByOutlet,
      outlet ? { outlet } : ("skip" as any)
    ) || [];

  const updateStatus = useMutation(api.orders.updateOrderStatus);

  const handleMarkServed = async (orderId: any) => {
    try {
      await updateStatus({ orderId, status: "served" });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  if (!outlet || !mounted) return null;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-8 sm:h-9 px-2 sm:px-4 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider relative transition-all duration-300 gap-1.5 sm:gap-2",
          activeOrders.some((o) => o.status === "ready")
            ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 shadow-sm shadow-emerald-100"
            : "bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100"
        )}
      >
        <div
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            activeOrders.length > 0 ? "bg-current animate-pulse" : "bg-gray-300"
          )}
        />
        <span className="hidden min-[380px]:inline">Updates</span>
        <span className="min-[380px]:hidden">KOT</span>
        {activeOrders.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] sm:text-[10px] w-4 sm:w-4.5 h-4 sm:h-4.5 rounded-full flex items-center justify-center border-2 border-white font-black">
            {activeOrders.length}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[280px] sm:w-[320px] p-0 rounded-2xl overflow-hidden border-gray-100 shadow-xl bg-white"
      >
        <PopoverHeader className="px-4 py-3 bg-gray-50/50 border-b border-gray-100">
          <PopoverTitle className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Live KOT Updates
          </PopoverTitle>
        </PopoverHeader>
        <div className="max-h-[350px] overflow-y-auto no-scrollbar py-1">
          {activeOrders.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <p className="text-sm font-medium text-gray-400">No active orders</p>
            </div>
          ) : (
            activeOrders.map((order) => (
              <div
                key={order._id}
                className="px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-gray-900">
                    Table {order.tableNumber}
                  </span>
                  <span
                    className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                      order.status === "ready"
                        ? "bg-emerald-500 text-white"
                        : order.status === "preparing"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {order.status === "ready"
                      ? "Ready"
                      : order.status === "preparing"
                      ? "Kitchen"
                      : "Queued"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                  {order.items.map((item, i) => (
                    <span key={i} className="text-[10px] text-gray-400 font-medium">
                      {item.quantity}× {item.name}
                    </span>
                  ))}
                </div>
                {order.status === "ready" && (
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="flex-1 flex items-center gap-2">
                      <div className="w-full h-0.5 bg-emerald-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-emerald-500"
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{
                            repeat: Infinity,
                            duration: 1.5,
                            ease: "linear",
                          }}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600 whitespace-nowrap">
                        Ready for Pickup
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleMarkServed(order._id)}
                      className="h-6 text-[10px] px-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-none font-bold shrink-0"
                    >
                      Served
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── AI Chatbot Button + Slide-over Panel ────────────────────────────────────

function AIChatbotButton({ token, staffRole }: { token: string; staffRole: string }) {
  const [open, setOpen] = useState(false);

  if (staffRole !== "admin") return null;

  // Hide BottomNav when chat is open
  useEffect(() => {
    if (open) {
      document.body.classList.add("chat-open");
    } else {
      document.body.classList.remove("chat-open");
    }
    return () => document.body.classList.remove("chat-open");
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-8 sm:h-9 px-2 sm:px-3 rounded-xl font-bold text-[10px] sm:text-xs gap-1.5 transition-all duration-200",
          "bg-green-50 border-green-200 text-green-700 hover:bg-green-100 shadow-sm shadow-green-100"
        )}
        title="Hotel AI Assistant"
      >
        <Sparkles size={13} className="shrink-0" />
        <span className="hidden sm:inline">Ask AI</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            <motion.div
              key="panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 z-[100] h-dvh w-full sm:max-w-[480px] flex flex-col shadow-2xl bg-white"
            >
              <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-green-100 shrink-0">
                <span className="text-xs font-black uppercase tracking-widest text-green-700">AI Assistant</span>
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex-1 min-h-0">
                <AdminAIChatbot token={token} staffRole={staffRole} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── PIN Change Dialog ────────────────────────────────────────────────────────

function ChangePinDialog({ open, onOpenChange, staffName, token }: { open: boolean, onOpenChange: (o: boolean) => void, staffName: string, token: string }) {
  const changePin = useMutation(api.auth.changeMyPin);
  const [vals, setVals] = useState({ old: "", new: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (vals.new !== vals.confirm) return toast.error("New PINs do not match");
    if (vals.new.length !== 4) return toast.error("PIN must be 4 digits");
    setLoading(true);
    try {
      await changePin({ token, oldPin: vals.old, newPin: vals.new });
      toast.success("PIN changed successfully!");
      setVals({ old: "", new: "", confirm: "" });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px] rounded-3xl p-6 border-gray-100 shadow-2xl bg-white isolate z-90 shadow-indigo-100/50">
        <DialogHeader className="mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-2">
            <KeyRound size={24} />
          </div>
          <DialogTitle className="text-xl font-black text-gray-900">Change PIN</DialogTitle>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{staffName}</p>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current PIN</Label>
            <Input
              type="password"
              placeholder="••••"
              maxLength={4}
              value={vals.old}
              onChange={(e) => setVals(p => ({ ...p, old: e.target.value.replace(/\D/g, "") }))}
              className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-11 text-center text-lg tracking-[0.5em] font-bold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">New 4-Digit PIN</Label>
            <Input
              type="password"
              placeholder="••••"
              maxLength={4}
              value={vals.new}
              onChange={(e) => setVals(p => ({ ...p, new: e.target.value.replace(/\D/g, "") }))}
              className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-11 text-center text-lg tracking-[0.5em] font-bold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Confirm New PIN</Label>
            <Input
              type="password"
              placeholder="••••"
              maxLength={4}
              value={vals.confirm}
              onChange={(e) => setVals(p => ({ ...p, confirm: e.target.value.replace(/\D/g, "") }))}
              className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-11 text-center text-lg tracking-[0.5em] font-bold"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={loading || vals.new.length !== 4 || vals.old.length !== 4}
            className="w-full h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg shadow-indigo-100 mt-2"
          >
            {loading ? "Changing..." : "Update PIN"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Mobile Topbar ───────────────────────────────────────────────────────────

export function Topbar() {
  const [mounted, setMounted] = useState(false);
  const { token, staff } = useAuthSession();
  const [showPinDialog, setShowPinDialog] = useState(false);
  const logout = useMutation(api.auth.logout);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    if (token) {
      await logout({ token });
      localStorage.removeItem("staff_session_token");
      window.location.reload();
    }
  };

  return (
    <header className="lg:hidden sticky top-0 z-40 w-full bg-white border-b border-gray-100 shadow-sm">
      <div className="flex h-[64px] items-center justify-between px-4 gap-3">
        <div className="flex items-center gap-2.5">
          <Sheet>
            <SheetTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "text-gray-500 hover:bg-gray-100"
              )}
            >
              <Menu size={22} />
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[240px] p-0 border-r border-gray-100 outline-none"
            >
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SidebarContent isMobile />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
              SP
            </div>
            <span className="text-sm font-bold text-gray-900 truncate max-w-[100px] xs:max-w-none">
              Sarovar Palace
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LiveUpdates />

          {mounted && staff && (
            <AIChatbotButton token={token} staffRole={staff.role} />
          )}



          {/* Avatar + Popover (Mobile) */}
          <Popover>
            <PopoverTrigger className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-xs cursor-pointer shadow-md shadow-indigo-100 border-none outline-none shrink-0">
              {staff?.name?.slice(0, 2).toUpperCase() ?? "AS"}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-2 rounded-2xl border-gray-100 shadow-xl bg-white">
              <div className="px-3 py-2 border-b border-gray-50 mb-1">
                <p className="text-xs font-bold text-gray-900 truncate">{staff?.name}</p>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{staff?.role}</p>
              </div>
              <button 
                onClick={() => setShowPinDialog(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors text-left"
              >
                <KeyRound size={14} /> Change PIN
              </button>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left"
              >
                <LogOut size={14} /> Logout
              </button>
            </PopoverContent>
          </Popover>

          {mounted && staff && token && (
            <ChangePinDialog 
              open={showPinDialog} 
              onOpenChange={setShowPinDialog} 
              staffName={staff.name}
              token={token} 
            />
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Desktop Topbar ──────────────────────────────────────────────────────────

export function DesktopTopbar({ title }: { title?: string; outlet?: string }) {
  const [mounted, setMounted] = useState(false);
  const { token, staff } = useAuthSession();
  const [showPinDialog, setShowPinDialog] = useState(false);
  const logout = useMutation(api.auth.logout);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    if (token) {
      await logout({ token });
      localStorage.removeItem("staff_session_token");
      window.location.reload();
    }
  };

  return (
    <div className="hidden lg:flex h-[64px] items-center justify-between px-6 bg-white border-b border-gray-100 sticky top-0 z-30">
      <h2 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h2>

      <div className="flex items-center gap-3">
        <LiveUpdates />

        {mounted && staff && <AIChatbotButton token={token} staffRole={staff.role} />}

        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 w-52 text-sm text-gray-400 cursor-text hover:bg-gray-200 transition-colors">
          <Search size={14} />
          <span className="flex-1">Search...</span>
          <kbd className="text-[10px] font-bold text-gray-400 border border-gray-300 rounded px-1 py-0.5">⌘K</kbd>
        </div>



        <Popover>
          <PopoverTrigger className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-xs cursor-pointer shadow-md shadow-indigo-100 hover:scale-105 transition-transform border-none outline-none">
            {staff?.name?.slice(0, 2).toUpperCase() ?? "AS"}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-2 rounded-2xl border-gray-100 shadow-xl bg-white">
            <div className="px-3 py-2 border-b border-gray-50 mb-1">
              <p className="text-xs font-bold text-gray-900 truncate">{staff?.name}</p>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{staff?.role}</p>
            </div>
            <button 
              onClick={() => setShowPinDialog(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors text-left"
            >
              <KeyRound size={14} /> Change PIN
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left"
            >
              <LogOut size={14} /> Logout
            </button>
          </PopoverContent>
        </Popover>

        {mounted && staff && token && (
          <ChangePinDialog 
            open={showPinDialog} 
            onOpenChange={setShowPinDialog} 
            staffName={staff.name}
            token={token} 
          />
        )}
      </div>
    </div>
  );
}
