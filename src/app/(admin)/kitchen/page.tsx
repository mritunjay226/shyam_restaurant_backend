"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { DesktopTopbar } from "@/components/Topbar";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, UtensilsCrossed, Coffee, CheckCircle2, PlayCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Id } from "../../../../convex/_generated/dataModel";

export default function KitchenPage() {
  const [activeTab, setActiveTab] = useState<"restaurant" | "cafe">("restaurant");
  const settings = useQuery(api.settings.getHotelSettings);

  // Sync default tab from settings once loaded
  useEffect(() => {
    if (settings?.defaultKitchenTab === "cafe" || settings?.defaultKitchenTab === "restaurant") {
      setActiveTab(settings.defaultKitchenTab);
    }
  }, [settings?.defaultKitchenTab]);
  
  // Real-time query for status-specific orders (fully server-side optimized)
  const activeKitchenOrders = useQuery(api.orders.getActiveKitchenOrders) || [];
  const updateStatus = useMutation(api.orders.updateOrderStatus);

  // Filter for active kitchen orders (exclude billed/paid)
  const activeOrders = activeKitchenOrders.filter(o => 
    o.outlet === activeTab
  ).sort((a, b) => new Date(a._creationTime).getTime() - new Date(b._creationTime).getTime());

  // Audio Notification Logic
  const prevOrdersCount = useRef(activeOrders.length);
  
  useEffect(() => {
    if (activeOrders.length > prevOrdersCount.current) {
      playBeep();
      toast.info(`New ${activeTab} order received!`, { position: "top-right" });
    }
    prevOrdersCount.current = activeOrders.length;
  }, [activeOrders.length, activeTab]);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio beep failed:", e);
    }
  };

  const handleStatusUpdate = async (orderId: Id<"orders">, newStatus: string) => {
    try {
      await updateStatus({ orderId, status: newStatus });
      toast.success(`Order marked as ${newStatus}`);
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50">
      <DesktopTopbar title="Kitchen Display System" />
      
      <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Live Orders</h1>
            <p className="text-sm text-gray-500 font-medium">Managing real-time food preparation</p>
          </div>

          {/* Tabs */}
          <div className="flex p-1 bg-white border border-gray-100 rounded-2xl shadow-sm horizontal-scroll max-w-full">
            <TabButton 
              active={activeTab === "restaurant"} 
              onClick={() => setActiveTab("restaurant")}
              icon={<UtensilsCrossed size={16} />}
              label="Restaurant"
              count={activeKitchenOrders.filter(o => o.outlet === "restaurant" && (o.status === "kot_generated" || o.status === "preparing")).length}
            />
            <TabButton 
              active={activeTab === "cafe"} 
              onClick={() => setActiveTab("cafe")}
              icon={<Coffee size={16} />}
              label="Café"
              count={activeKitchenOrders.filter(o => o.outlet === "cafe" && (o.status === "kot_generated" || o.status === "preparing")).length}
            />
          </div>
        </div>

        {/* KDS Grid */}
        <AnimatePresence mode="popLayout">
          {activeOrders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {activeOrders.map((order) => (
                <OrderCard 
                  key={order._id} 
                  order={order} 
                  onUpdateStatus={handleStatusUpdate}
                />
              ))}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-32 text-center"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                <UtensilsCrossed size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">All caught up!</h3>
              <p className="text-gray-500">No pending orders in the {activeTab} kitchen.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, count: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-300 font-bold text-sm",
        active 
          ? "bg-gray-900 text-white shadow-lg" 
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      {icon}
      {label}
      {count > 0 && (
        <span className={cn(
          "ml-1 px-1.5 py-0.5 rounded-md text-[10px] uppercase tracking-tighter",
          active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

function OrderCard({ order, onUpdateStatus }: { order: any, onUpdateStatus: (id: any, status: string) => void }) {
  const isPreparing = order.status === "preparing";
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "bg-white rounded-4xl border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col h-full max-h-[500px]",
        isPreparing ? "border-indigo-100 ring-2 ring-indigo-50" : "border-gray-100"
      )}
    >
      {/* Card Header */}
      <div className={cn(
        "px-6 py-4 border-b flex items-center justify-between",
        isPreparing ? "bg-indigo-50/50 border-indigo-100" : "bg-gray-50/50 border-gray-100"
      )}>
        <div>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{order.tableNumber}</span>
          <h4 className="font-black text-gray-900 leading-tight">Order #{order._id.slice(-4)}</h4>
        </div>
        <div className="flex items-center gap-1.5 text-gray-500 font-bold text-xs bg-white px-2 py-1 rounded-lg border border-gray-100">
          <Timer size={14} className="text-indigo-500" />
          {formatDistanceToNow(new Date(order._creationTime))}
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 p-6 space-y-4 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        {order.items.map((item: any, idx: number) => (
          <div key={idx} className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <span className="shrink-0 w-6 h-6 flex items-center justify-center bg-gray-100 rounded-lg text-xs font-black text-gray-600">
                {item.quantity}
              </span>
              <div>
                <p className="font-bold text-gray-900 leading-none mb-1">{item.name}</p>
                <div className="flex gap-2 items-center flex-wrap">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{item.category}</p>
                  {item.course && (
                    <span className={cn(
                      "text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md",
                      item.course === "Starter" ? "bg-blue-100 text-blue-700"
                        : item.course === "Main" ? "bg-orange-100 text-orange-700" 
                        : "bg-purple-100 text-purple-700" 
                    )}>
                      {item.course}
                    </span>
                  )}
                </div>
                {item.notes && (
                  <p className="text-xs font-bold text-red-500 mt-1.5 italic wrap-break-words flex items-start gap-1">
                    <span className="shrink-0">•</span> {item.notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Card Footer Actions */}
      <div className="p-4 bg-gray-50/30 border-t border-gray-100 mt-auto">
        {!isPreparing ? (
          <Button 
            onClick={() => onUpdateStatus(order._id, "preparing")}
            className="w-full bg-white text-gray-900 border-2 border-gray-900 hover:bg-gray-900 hover:text-white rounded-xl h-11 font-black transition-all"
          >
            <PlayCircle size={18} className="mr-2" />
            START COOKING
          </Button>
        ) : (
          <Button 
            onClick={() => onUpdateStatus(order._id, "ready")}
            className="w-full bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl h-11 font-black shadow-lg shadow-indigo-100 transition-all"
          >
            <CheckCircle2 size={18} className="mr-2" />
            READY FOR SERVICE
          </Button>
        )}
      </div>
    </motion.div>
  );
}
