"use client";

import { BedDouble, User, Clock, IndianRupee, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RoomViewData {
  _id: string;
  roomNumber: string;
  category?: string;
  tariff?: number;
  status: string;
  guestName?: string;
  checkInDate?: string;
  nights?: number;
  advance?: number;
  bookingId?: string;
  extraBed?: boolean;
}

interface RoomCardProps {
  room: RoomViewData;
  index?: number;
  onClick?: (room: RoomViewData) => void;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  dot: string;
  cardBase: string;
  hoverGlow: string;
}> = {
  available: {
    label: "Available",
    dot: "bg-emerald-500",
    cardBase: "border-gray-200/60 bg-white",
    hoverGlow: "hover:border-emerald-300 hover:shadow-[0_8px_30px_rgb(16,185,129,0.12)]",
  },
  occupied: {
    label: "Occupied",
    dot: "bg-rose-500",
    cardBase: "border-gray-200/60 bg-white",
    hoverGlow: "hover:border-rose-300 hover:shadow-[0_8px_30px_rgb(244,63,94,0.12)]",
  },
  pending_checkout: {
    label: "Checkout Pending",
    dot: "bg-amber-500",
    cardBase: "border-amber-200/80 bg-amber-50/30",
    hoverGlow: "hover:border-amber-400 hover:shadow-[0_8px_30px_rgb(245,158,11,0.15)]",
  },
  dirty: {
    label: "Dirty",
    dot: "bg-orange-500",
    cardBase: "border-orange-200/80 bg-orange-50/30",
    hoverGlow: "hover:border-orange-400 hover:shadow-[0_8px_30px_rgb(249,115,22,0.15)]",
  },
};

const CATEGORY_STYLES: Record<string, string> = {
  standard: "text-gray-500",
  luxury: "text-purple-600 font-medium",
  suite: "text-blue-600 font-medium",
  premium: "text-indigo-600 font-medium",
};

export function RoomCard({ room, onClick }: RoomCardProps) {
  const statusKey = (room.status || "available").toLowerCase().replace(" ", "_");
  const s = STATUS_CONFIG[statusKey] || STATUS_CONFIG.available;
  const catKey = (room.category || "standard").toLowerCase();
  const catColor = CATEGORY_STYLES[catKey] || CATEGORY_STYLES.standard;
  const catLabel = room.category
    ? room.category.charAt(0).toUpperCase() + room.category.slice(1)
    : "Standard";

  const floor = Math.floor((parseInt(room.roomNumber) || 100) / 100);
  const isOccupied = statusKey === "occupied" || statusKey === "pending_checkout";

  return (
    <button
      onClick={() => onClick?.(room)}
      className={cn(
        "group relative w-full text-left rounded-3xl border transition-all duration-300 ease-out",
        "active:scale-[0.98] overflow-hidden cursor-pointer",
        s.cardBase, s.hoverGlow
      )}
    >
      {/* Subtle Inner Gradient for Depth */}
      <div className="absolute inset-0 bg-linear-to-br from-white/60 to-transparent pointer-events-none" />

      <div className="relative p-5">
        {/* Top Header: Room Number & Status */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-2xl font-bold tracking-tight text-gray-900 tabular-nums leading-none">
                {room.roomNumber}
              </h3>
              {catKey === "suite" || catKey === "luxury" ? (
                <Sparkles size={14} className={cn("mt-0.5", catColor)} />
              ) : null}
            </div>
            <p className={cn("text-xs tracking-wide uppercase", catColor)}>
              {catLabel} · Floor {floor}
            </p>
          </div>

          {/* Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-gray-100 shadow-sm">
            <span className="relative flex h-2 w-2">
              {isOccupied && (
                <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-60", s.dot)} />
              )}
              <span className={cn("relative inline-flex rounded-full h-2 w-2", s.dot)} />
            </span>
            <span className="text-[10px] font-bold text-gray-700 tracking-wide uppercase">
              {s.label}
            </span>
          </div>
        </div>

        {/* Dynamic Content Area */}
        <div className="min-h-[76px] flex flex-col justify-end">
          {isOccupied && room.guestName ? (
            <div className="space-y-2.5 w-full">
              {/* Guest Profile Bubble */}
              <div className="flex items-center gap-3 bg-gray-50/80 group-hover:bg-white transition-colors border border-gray-100 rounded-2xl p-2.5">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-linear-to-tr from-green-600 to-emerald-400 flex items-center justify-center shadow-sm">
                    <User size={14} className="text-white" />
                  </div>
                  {room.extraBed && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 border-2 border-white rounded-full flex items-center justify-center shadow-sm animate-bounce">
                      <BedDouble size={8} className="text-white fill-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate">{room.guestName}</p>
                  {room.checkInDate && (
                    <p className="text-[11px] text-gray-500 flex items-center gap-1 font-medium mt-0.5">
                      <Clock size={10} /> {room.checkInDate}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 pb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center border shrink-0 bg-gray-50 border-gray-100 text-gray-400">
                <BedDouble size={14} />
              </div>
              <span className={cn("text-sm font-medium", statusKey === "dirty" ? "text-orange-600" : "text-gray-400")}>
                {statusKey === "dirty" ? "Needs cleaning" : "Ready for check-in"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Price Strip */}
      <div className="relative px-5 py-3 border-t border-gray-100/80 bg-gray-50/50 group-hover:bg-gray-50/80 transition-colors flex items-center justify-between">
        <div className="flex items-center text-gray-500 group-hover:text-gray-900 transition-colors">
          <IndianRupee size={14} className="mr-0.5" />
          <span className="text-base font-bold tabular-nums tracking-tight">
            {(room.tariff || 0).toLocaleString("en-IN")}
          </span>
          <span className="text-xs ml-1 font-medium text-gray-400">/ night</span>
        </div>

        {statusKey === "pending_checkout" && (
          <div className="flex items-center gap-1 text-amber-600">
            <AlertCircle size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">Action</span>
          </div>
        )}
      </div>
    </button>
  );
}
