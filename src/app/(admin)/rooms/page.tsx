"use client";

import { useState } from "react";
import { format, addDays, subDays, startOfToday, isSameDay } from "date-fns";
import { Plus, Grid, Calendar as CalendarIcon, Filter, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { RoomCard, RoomViewData } from "@/components/RoomCard";
import { BookingSheet } from "@/components/BookingSheet";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { DesktopTopbar } from "@/components/Topbar";
import { cn } from "@/lib/utils";

const FILTERS = ["All", "Available", "Occupied", "Pending Checkout", "Dirty"];

export default function RoomsPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedRoom, setSelectedRoom] = useState<RoomViewData | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [view, setView] = useState<"grid" | "calendar">("grid");
  const [search, setSearch] = useState("");
  const [calendarStartDate, setCalendarStartDate] = useState<Date>(startOfToday());

  const rawRooms = useQuery(api.rooms.getAllRooms, {});
  const rawBookings = useQuery(api.bookings.getAllBookings);

  const rooms: RoomViewData[] = (rawRooms || []).map(room => {
    const activeBooking = (rawBookings || []).find(b =>
      b.roomId === room._id && 
      b.status !== "cancelled" && 
      b.status !== "checked_out"
    );
    const nights = activeBooking?.checkIn && activeBooking?.checkOut
      ? Math.max(1, Math.round((new Date(activeBooking.checkOut).getTime() - new Date(activeBooking.checkIn).getTime()) / 86400000))
      : 0;
    return {
      _id: room._id,
      roomNumber: room.roomNumber,
      category: room.category,
      tariff: room.tariff,
      status: room.status,
      guestName: activeBooking?.guestName,
      checkInDate: activeBooking?.checkIn,
      nights: activeBooking ? nights : undefined,
      advance: activeBooking?.advance,
      bookingId: activeBooking?._id,
      extraBed: activeBooking?.extraBed,
    };
  }).sort((a, b) => parseInt(a.roomNumber) - parseInt(b.roomNumber));

  const filtered = rooms.filter(r => {
    const matchesFilter = activeFilter === "All" ||
      r.status.replace(/_/g, " ").toLowerCase() === activeFilter.toLowerCase();
    const matchesSearch = search === "" ||
      r.roomNumber.includes(search) ||
      r.guestName?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: rooms.length,
    available: rooms.filter(r => r.status === "available").length,
    occupied: rooms.filter(r => r.status === "occupied").length,
    pending: rooms.filter(r => r.status === "pending_checkout").length,
    dirty: rooms.filter(r => r.status === "dirty").length,
  };

  const calendarDates = Array.from({ length: 14 }).map((_, i) => addDays(calendarStartDate, i));
  const today = startOfToday();

  if (!rawRooms || !rawBookings) {
    return (
      <div className="flex flex-col min-h-full">
        <DesktopTopbar title="Rooms" />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-[400px]">
          <div className="w-10 h-10 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium animate-pulse">Loading room inventory…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <DesktopTopbar title="Rooms" />

      <div className="p-5 lg:p-6 space-y-5 max-w-7xl mx-auto w-full pb-24 lg:pb-6">
        
        {/* Page header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{rooms.length} Rooms</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage room inventory and guest bookings</p>
          </div>
          <Button onClick={() => { setIsSheetOpen(true); setSelectedRoom(null); }} className="bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-sm gap-2 shrink-0">
            <Plus size={16} /> <span className="hidden sm:inline">New Booking</span>
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: "bg-gray-100 text-gray-600" },
            { label: "Available", value: stats.available, color: "bg-green-100 text-green-700" },
            { label: "Occupied", value: stats.occupied, color: "bg-red-100 text-red-700" },
            { label: "Pending", value: stats.pending, color: "bg-amber-100 text-amber-700" },
            { label: "Dirty", value: stats.dirty, color: "bg-orange-100 text-orange-700" },
          ].map(s => (
            <button
              key={s.label}
              onClick={() => setActiveFilter(s.label === "Total" ? "All" : s.label)}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow"
            >
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{s.value}</p>
              <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block", s.color)}>
                {s.label}
              </span>
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2.5 flex-1 shadow-sm">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by room number or guest name…"
              className="flex-1 text-sm bg-transparent outline-none text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={cn(
                  "whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-all border shrink-0",
                  activeFilter === f
                    ? "bg-green-600 text-white border-green-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-100 hover:border-green-200 hover:text-green-700"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-white border border-gray-100 rounded-xl p-1 shadow-sm shrink-0">
            <button
              onClick={() => setView("grid")}
              className={cn("p-2 rounded-lg transition-all", view === "grid" ? "bg-green-600 text-white" : "text-gray-400 hover:text-gray-700")}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setView("calendar")}
              className={cn("p-2 rounded-lg transition-all", view === "calendar" ? "bg-green-600 text-white" : "text-gray-400 hover:text-gray-700")}
            >
              <CalendarIcon size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        {view === "grid" ? (
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((room, idx) => (
                <motion.div
                  key={room._id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                >
                  <RoomCard room={room} index={idx} onClick={r => { setSelectedRoom(r); setIsSheetOpen(true); }} />
                </motion.div>
              ))}
            </AnimatePresence>

            {filtered.length === 0 && (
              <div className="col-span-full py-20 bg-white rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Filter size={24} className="text-gray-400" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">No matching rooms</p>
                  <p className="text-sm text-gray-500 mt-0.5">Try changing your search or filter.</p>
                </div>
                <Button variant="outline" onClick={() => { setActiveFilter("All"); setSearch(""); }} className="rounded-xl">
                  Clear Filter
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Calendar View */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Calendar Navigation Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCalendarStartDate(d => subDays(d, 7))}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors"
                  title="Previous 7 days"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setCalendarStartDate(d => subDays(d, 1))}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors"
                  title="Previous day"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <CalendarIcon size={14} className="text-gray-400 shrink-0" />
                <input
                  type="date"
                  value={format(calendarStartDate, "yyyy-MM-dd")}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [y, m, d] = e.target.value.split("-").map(Number);
                      setCalendarStartDate(new Date(y, m - 1, d));
                    }
                  }}
                  className="text-sm font-bold text-gray-700 bg-transparent border-none outline-none cursor-pointer hover:text-green-700 transition-colors"
                  style={{ colorScheme: "light" }}
                />
                <button
                  onClick={() => setCalendarStartDate(startOfToday())}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all border shrink-0",
                    isSameDay(calendarStartDate, today)
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-green-600 border-green-200 hover:bg-green-50"
                  )}
                >
                  Today
                </button>
              </div>



              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCalendarStartDate(d => addDays(d, 1))}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors"
                  title="Next day"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setCalendarStartDate(d => addDays(d, 7))}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors"
                  title="Next 7 days"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="horizontal-scroll">
              <div className="min-w-[900px]">
                {/* Date header */}
                <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: '110px repeat(14, 1fr)' }}>
                  <div className="p-3 bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center justify-center border-r border-gray-100">
                    Room
                  </div>
                  {calendarDates.map((date, i) => {
                    const isToday = isSameDay(date, today);
                    const isSelected = isSameDay(date, calendarStartDate);
                    return (
                      <button
                        key={i}
                        onClick={() => setCalendarStartDate(date)}
                        className={cn(
                          "p-3 text-center border-r border-gray-100 transition-colors hover:bg-green-50 cursor-pointer",
                          isToday && "bg-green-50",
                          isSelected && !isToday && "bg-indigo-50"
                        )}
                      >
                        <div className={cn(
                          "text-sm font-bold",
                          isToday ? "text-green-700" : isSelected ? "text-indigo-700" : "text-gray-800"
                        )}>
                          {format(date, "dd")}
                        </div>
                        <div className={cn(
                          "text-[10px] font-bold uppercase",
                          isToday ? "text-green-500" : isSelected ? "text-indigo-400" : "text-gray-400"
                        )}>
                          {format(date, "eee")}
                        </div>
                        {isToday && (
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 mx-auto mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Room rows */}
                {rooms.map(room => (
                  <div key={room._id} className="grid border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors" style={{ gridTemplateColumns: '110px repeat(14, 1fr)' }}>
                    <div className="p-3 border-r border-gray-100 flex flex-col justify-center">
                      <span className="text-sm font-bold text-gray-900 tabular-nums">#{room.roomNumber}</span>
                      <span className="text-[10px] text-gray-400 capitalize mt-0.5">{room.category}</span>
                    </div>
                    {calendarDates.map((date, i) => {
                      const isOccupied = room.status !== "available" && i < (room.nights || 2);
                      const isToday = isSameDay(date, today);
                      return (
                        <div
                          key={i}
                          className={cn(
                            "p-1 border-r border-gray-100 last:border-0 min-h-[48px]",
                            isToday && "bg-green-50/60"
                          )}
                          onClick={() => { setSelectedRoom(room); setIsSheetOpen(true); }}
                        >
                          {isOccupied && (
                            <div className="w-full h-full bg-green-100 border border-green-200 rounded-lg flex items-center justify-center cursor-pointer hover:bg-green-200 transition-colors">
                              <span className="text-[10px] font-bold text-green-700 truncate px-1">
                                {room.guestName?.split(" ")[0]}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <BookingSheet room={selectedRoom} isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
    </div>
  );
}


