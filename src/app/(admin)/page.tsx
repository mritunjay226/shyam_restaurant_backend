"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  BedDouble, CheckCircle2, LogOut, CalendarCheck, ArrowUpRight,
  UtensilsCrossed, Coffee, PartyPopper, IndianRupee, ClipboardList,
  Users, Banknote, Table2, ShoppingBag,
} from "lucide-react";

import { StatCard } from "@/components/StatCard";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { DesktopTopbar } from "@/components/Topbar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

// ── sparkline seeds (decorative, consistent) ──────────────────────────
const SPARK_BOOKINGS   = [8, 10, 7, 14, 12, 16, 11, 18, 15, 19];
const SPARK_AVAILABLE  = [12, 10, 13, 9, 11, 8, 10, 7, 9, 8];
const SPARK_CHECKIN    = [3, 5, 2, 6, 4, 7, 5, 8, 6, 9];
const SPARK_CHECKOUT   = [2, 3, 4, 2, 5, 3, 4, 6, 4, 5];
const SPARK_ORDERS     = [4, 6, 5, 8, 7, 9, 6, 11, 8, 10];
const SPARK_REVENUE    = [5000, 7000, 6000, 9000, 8000, 12000, 10000, 15000, 12000, 18000];
const SPARK_TABLES     = [2, 3, 4, 3, 5, 4, 6, 5, 7, 6];
const SPARK_BANQ       = [1, 2, 1, 3, 2, 4, 3, 5, 4, 6];

type TabId = "hotel" | "restaurant" | "cafe" | "banquet";

const TABS: { id: TabId; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { id: "hotel",      label: "Hotel",      icon: <BedDouble size={16} />,       color: "#16A34A", bg: "#DCFCE7" },
  { id: "restaurant", label: "Restaurant", icon: <UtensilsCrossed size={16} />, color: "#EA580C", bg: "#FFEDD5" },
  { id: "cafe",       label: "Café",       icon: <Coffee size={16} />,          color: "#D97706", bg: "#FEF3C7" },
  { id: "banquet",    label: "Banquets",   icon: <PartyPopper size={16} />,     color: "#7C3AED", bg: "#EDE9FE" },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    confirmed:        { label: "Confirmed",   cls: "bg-green-100 text-green-700" },
    checked_in:       { label: "Checked In",  cls: "bg-blue-100 text-blue-700" },
    checked_out:      { label: "Checked Out", cls: "bg-gray-100 text-gray-500" },
    cancelled:        { label: "Cancelled",   cls: "bg-red-100 text-red-600" },
    pending_checkout: { label: "Pending",     cls: "bg-amber-100 text-amber-700" },
    kot_generated:    { label: "KOT",         cls: "bg-sky-100 text-sky-700" },
    preparing:        { label: "Preparing",   cls: "bg-orange-100 text-orange-700" },
    ready:            { label: "Ready",       cls: "bg-teal-100 text-teal-700" },
    paid:             { label: "Paid",        cls: "bg-gray-100 text-gray-500" },
    billed:           { label: "Billed",      cls: "bg-purple-100 text-purple-700" },
    completed:        { label: "Completed",   cls: "bg-green-100 text-green-700" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${s.cls}`}>
      {s.label.toUpperCase()}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-gray-400 text-center py-8">{text}</p>;
}

function Avatar({ name, bg, color }: { name: string; bg: string; color: string }) {
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
      style={{ backgroundColor: bg, color }}
    >
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

// ── Sub-panel: history list row ────────────────────────────────────────
function HistoryRow({
  avatar, name, sub, right, status, bg, color,
}: {
  avatar: string; name: string; sub: string; right?: string; status?: string; bg: string; color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={avatar} bg={bg} color={color} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
        <p className="text-xs text-gray-500 truncate">{sub}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {status && <StatusBadge status={status} />}
        {right && <span className="text-xs text-gray-400">{right}</span>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TAB PANELS
// ══════════════════════════════════════════════════════════════════════

function HotelTab({ today, rooms, arrivals, departures, allBookings, outletRevenue }: any) {
  const occupied  = rooms.filter((r: any) => r.status === "occupied").length;
  const available = rooms.filter((r: any) => r.status === "available").length;
  const pending   = rooms.filter((r: any) => r.status === "pending_checkout").length;
  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="New Bookings Today" value={arrivals.length}  icon={CalendarCheck} iconBg="#DCFCE7" iconColor="#16A34A" sparkData={SPARK_BOOKINGS}  sparkColor="#16A34A" trend={12}  delay={0.05} />
        <StatCard label="Available Rooms"    value={available}        icon={BedDouble}     iconBg="#FEF3C7" iconColor="#D97706" sparkData={SPARK_AVAILABLE} sparkColor="#D97706"             delay={0.10} />
        <StatCard label="Check-Ins Today"    value={arrivals.length}  icon={CheckCircle2}  iconBg="#DBEAFE" iconColor="#2563EB" sparkData={SPARK_CHECKIN}   sparkColor="#2563EB" trend={5}   delay={0.15} />
        <StatCard label="Pending Checkouts"  value={pending}          icon={LogOut}        iconBg="#FEE2E2" iconColor="#DC2626" sparkData={SPARK_CHECKOUT}  sparkColor="#DC2626"             delay={0.20} />
      </div>

      {/* Bookings summary mini row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Bookings", value: allBookings.length, color: "#16A34A" },
          { label: "Occupied Rooms", value: occupied,           color: "#D97706" },
          { label: "Today Revenue",  value: `₹${(outletRevenue?.hotel ?? 0).toLocaleString("en-IN")}`, color: "#2563EB" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">{s.label}</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* History panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Arrivals */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">Today's Arrivals</p>
            <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-lg">{arrivals.length}</span>
          </div>
          <div className="space-y-3">
            {arrivals.length === 0 ? (
              <EmptyState text="No arrivals today." />
            ) : (
              arrivals.slice(0, 6).map((g: any) => (
                <HistoryRow
                  key={g._id}
                  avatar={g.guestName}
                  name={g.guestName}
                  sub={`Check-in · ${g.checkIn} → ${g.checkOut}`}
                  right={g.folioNumber ?? ""}
                  status="confirmed"
                  bg="#DCFCE7" color="#16A34A"
                />
              ))
            )}
          </div>
        </div>

        {/* Departures */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">Today's Departures</p>
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg">{departures.length}</span>
          </div>
          <div className="space-y-3">
            {departures.length === 0 ? (
              <EmptyState text="No departures today." />
            ) : (
              departures.slice(0, 6).map((g: any) => (
                <HistoryRow
                  key={g._id}
                  avatar={g.guestName}
                  name={g.guestName}
                  sub={`Checkout · ${g.checkOut}`}
                  right={g.folioNumber ?? ""}
                  status="pending_checkout"
                  bg="#FEF3C7" color="#D97706"
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent bookings feed */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-900">Recent Room Bookings</p>
          <ArrowUpRight size={16} className="text-gray-400" />
        </div>
        {allBookings.length === 0 ? (
          <EmptyState text="No bookings found." />
        ) : (
          <div className="space-y-3">
            {[...allBookings]
              .sort((a: any, b: any) => (b._creationTime ?? 0) - (a._creationTime ?? 0))
              .slice(0, 8)
              .map((b: any) => (
                <HistoryRow
                  key={b._id}
                  avatar={b.guestName}
                  name={b.guestName}
                  sub={`${b.checkIn} → ${b.checkOut} · ₹${b.totalAmount.toLocaleString("en-IN")}`}
                  right={b.folioNumber ?? b.source ?? ""}
                  status={b.status}
                  bg="#DCFCE7" color="#16A34A"
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FnBTab({ outlet, allOrders, todayOrders, outletRevenue, menuCount }: any) {
  const isRestaurant = outlet === "restaurant";
  const tab = isRestaurant ? TABS[1] : TABS[2];
  const activeOrders = allOrders.filter((o: any) =>
    ["kot_generated", "preparing", "ready"].includes(o.status)
  );
  const tablesOccupied = new Set(activeOrders.map((o: any) => o.tableNumber)).size;
  const todayOutletOrders = todayOrders.filter((o: any) => o.outlet === outlet);
  const revenue = isRestaurant ? outletRevenue?.restaurant ?? 0 : outletRevenue?.cafe ?? 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Orders"    value={activeOrders.length}      icon={ClipboardList} iconBg={tab.bg} iconColor={tab.color} sparkData={SPARK_ORDERS}  sparkColor={tab.color} delay={0.05} />
        <StatCard label="Orders Today"     value={todayOutletOrders.length} icon={ShoppingBag}   iconBg={tab.bg} iconColor={tab.color} sparkData={SPARK_ORDERS}  sparkColor={tab.color} delay={0.10} />
        <StatCard label="Today's Revenue"  value={`₹${revenue.toLocaleString("en-IN")}`} icon={IndianRupee} iconBg="#DCFCE7" iconColor="#16A34A" sparkData={SPARK_REVENUE} sparkColor="#16A34A" delay={0.15} />
        <StatCard label={isRestaurant ? "Tables Active" : "Menu Items"}
                  value={isRestaurant ? tablesOccupied : (menuCount ?? 0)}
                  icon={isRestaurant ? Table2 : Coffee}
                  iconBg={tab.bg} iconColor={tab.color} sparkData={SPARK_TABLES} sparkColor={tab.color} delay={0.20} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active orders */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">Active Orders</p>
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: tab.bg, color: tab.color }}>
              {activeOrders.length}
            </span>
          </div>
          <div className="space-y-3">
            {activeOrders.length === 0 ? (
              <EmptyState text="No active orders right now." />
            ) : (
              activeOrders.slice(0, 6).map((o: any) => (
                <HistoryRow
                  key={o._id}
                  avatar={`T${o.tableNumber}`}
                  name={o.kotNumber ?? `Table ${o.tableNumber}`}
                  sub={`${o.items.length} item${o.items.length !== 1 ? "s" : ""} · ₹${o.totalAmount.toLocaleString("en-IN")}`}
                  right={format(new Date(o.createdAt), "h:mm a")}
                  status={o.status}
                  bg={tab.bg} color={tab.color}
                />
              ))
            )}
          </div>
        </div>

        {/* Recent orders (all) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">Recent Orders</p>
            <ArrowUpRight size={16} className="text-gray-400" />
          </div>
          <div className="space-y-3">
            {allOrders.length === 0 ? (
              <EmptyState text="No orders found." />
            ) : (
              [...allOrders]
                .sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt))
                .slice(0, 8)
                .map((o: any) => (
                  <HistoryRow
                    key={o._id}
                    avatar={`T${o.tableNumber}`}
                    name={o.kotNumber ?? `Table ${o.tableNumber}`}
                    sub={`${o.items.length} item${o.items.length !== 1 ? "s" : ""} · ₹${o.totalAmount.toLocaleString("en-IN")}`}
                    right={o.createdAt.slice(0, 10)}
                    status={o.status}
                    bg={tab.bg} color={tab.color}
                  />
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BanquetTab({ halls, allBanquetBookings, outletRevenue, today }: any) {
  const tab = TABS[3];
  const confirmed   = allBanquetBookings.filter((b: any) => b.status === "confirmed");
  const todayEvents = allBanquetBookings.filter((b: any) => b.eventDate === today);
  const advanceTotal = confirmed.reduce((acc: number, b: any) => acc + (b.advance ?? 0), 0);
  const hallMap: Record<string, string> = {};
  (halls ?? []).forEach((h: any) => { hallMap[h._id] = h.name; });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Halls"         value={halls?.length ?? 0}  icon={PartyPopper}  iconBg={tab.bg} iconColor={tab.color} sparkData={SPARK_BANQ}    sparkColor={tab.color} delay={0.05} />
        <StatCard label="Confirmed Bookings"  value={confirmed.length}    icon={CalendarCheck} iconBg={tab.bg} iconColor={tab.color} sparkData={SPARK_BANQ}    sparkColor={tab.color} delay={0.10} />
        <StatCard label="Today's Events"      value={todayEvents.length}  icon={Users}         iconBg={tab.bg} iconColor={tab.color} sparkData={SPARK_BANQ}    sparkColor={tab.color} delay={0.15} />
        <StatCard label="Advance Collected"   value={`₹${advanceTotal.toLocaleString("en-IN")}`} icon={Banknote} iconBg="#DCFCE7" iconColor="#16A34A" sparkData={SPARK_REVENUE} sparkColor="#16A34A" delay={0.20} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Today's events */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">Today's Events</p>
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: tab.bg, color: tab.color }}>
              {todayEvents.length}
            </span>
          </div>
          <div className="space-y-3">
            {todayEvents.length === 0 ? (
              <EmptyState text="No events scheduled for today." />
            ) : (
              todayEvents.map((b: any) => (
                <HistoryRow
                  key={b._id}
                  avatar={b.guestName}
                  name={b.eventName}
                  sub={`${b.guestName} · ${hallMap[b.hallId] ?? "Hall"} · ${b.guestCount ?? "?"} guests · ${b.timeSlot ?? "full day"}`}
                  status={b.status}
                  bg={tab.bg} color={tab.color}
                />
              ))
            )}
          </div>
        </div>

        {/* Recent bookings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">Recent Banquet Bookings</p>
            <ArrowUpRight size={16} className="text-gray-400" />
          </div>
          <div className="space-y-3">
            {allBanquetBookings.length === 0 ? (
              <EmptyState text="No banquet bookings found." />
            ) : (
              [...allBanquetBookings]
                .sort((a: any, b: any) => (b._creationTime ?? 0) - (a._creationTime ?? 0))
                .slice(0, 8)
                .map((b: any) => (
                  <HistoryRow
                    key={b._id}
                    avatar={b.guestName}
                    name={b.eventName}
                    sub={`${b.guestName} · ${hallMap[b.hallId] ?? "Hall"} · ${b.eventDate} · ₹${b.totalAmount.toLocaleString("en-IN")}`}
                    status={b.status}
                    bg={tab.bg} color={tab.color}
                  />
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════

const WEEK_REVENUE_FALLBACK = [
  { day: "Sat", v: 12000 }, { day: "Sun", v: 18000 }, { day: "Mon", v: 9000 },
  { day: "Tue", v: 22000 }, { day: "Wed", v: 17000 }, { day: "Thu", v: 25000 },
  { day: "Fri", v: 21000 },
];

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("hotel");

  useEffect(() => { setMounted(true); }, []);

  const today = format(new Date(), "yyyy-MM-dd");

  // ── Hotel data ──────────────────────────────────────────────────
  const rooms          = useQuery(api.rooms.getAllRooms, {}) ?? [];
  const arrivals       = useQuery(api.bookings.getTodayArrivals, { today }) ?? [];
  const departures     = useQuery(api.bookings.getTodayDepartures, { today }) ?? [];
  const allBookings    = useQuery(api.bookings.getAllBookings) ?? [];
  const weeklyRevenue  = useQuery(api.reports.getWeeklyRevenue, { today });
  const dashStats      = useQuery(api.reports.getDashboardStats, { today });
  const outletRevenue  = useQuery(api.reports.getOutletDailyRevenue, { today });

  // ── F&B data ───────────────────────────────────────────────────
  const todayOrders         = useQuery(api.orders.getTodayOrders, { today }) ?? [];
  const restaurantOrders    = useQuery(api.orders.getOrdersByOutlet, { outlet: "restaurant" }) ?? [];
  const cafeOrders          = useQuery(api.orders.getOrdersByOutlet, { outlet: "cafe" }) ?? [];
  const cafeMenu            = useQuery(api.menuItems.getMenuByOutlet, { outlet: "cafe" }) ?? [];

  // ── Banquet data ───────────────────────────────────────────────
  const halls               = useQuery(api.banquet.getAllHalls, {}) ?? [];
  const allBanquetBookings  = useQuery(api.banquet.getAllBanquetBookings) ?? [];

  const todayRevenue = dashStats?.todayRevenue ?? 0;

  return (
    <div className="flex flex-col min-h-full">
      <DesktopTopbar title="Dashboard" />

      <div className="p-5 lg:p-6 space-y-6 max-w-7xl mx-auto w-full">

        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}, Admin! 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(new Date(), "EEEE, d MMMM yyyy")} · Here's everything happening at Sarovar Palace today.
          </p>
        </motion.div>

        {/* Revenue Chart — always visible */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5"
        >
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Total {TABS.find(t => t.id === activeTab)?.label} Revenue Today</p>
              <p className="text-3xl font-bold text-gray-900 tabular-nums mt-1">
                ₹{(activeTab === 'hotel' ? outletRevenue?.hotel : 
                   activeTab === 'restaurant' ? outletRevenue?.restaurant :
                   activeTab === 'cafe' ? outletRevenue?.cafe :
                   activeTab === 'banquet' ? outletRevenue?.banquet : todayRevenue)?.toLocaleString("en-IN") || 0}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {outletRevenue && (
                <div className="hidden md:flex gap-3 text-xs font-semibold">
                  {[
                    { label: "Hotel",      val: outletRevenue.hotel,      color: "#16A34A" },
                    { label: "Restaurant", val: outletRevenue.restaurant, color: "#EA580C" },
                    { label: "Café",       val: outletRevenue.cafe,       color: "#D97706" },
                    { label: "Banquet",    val: outletRevenue.banquet,    color: "#7C3AED" },
                  ].map((s) => (
                    <div key={s.label} className="flex flex-col items-end">
                      <span className="text-gray-400">{s.label}</span>
                      <span style={{ color: s.color }}>₹{s.val.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              )}
              <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-lg">↑ 14%</span>
            </div>
          </div>
          <div className="h-[180px] mt-4 relative w-full overflow-hidden">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={weeklyRevenue ?? WEEK_REVENUE_FALLBACK} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={26}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    cursor={{ fill: `${TABS.find(t => t.id === activeTab)?.color}08`, radius: 8 }}
                    contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 13 }}
                    formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, `${TABS.find(t => t.id === activeTab)?.label} Revenue`]}
                  />
                  <Bar dataKey={activeTab} fill={TABS.find(t => t.id === activeTab)?.color} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Tab Bar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.3 }}
          className="flex gap-2 flex-wrap"
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
                style={active ? { background: tab.bg, color: tab.color } : {}}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {activeTab === "hotel" && (
              <HotelTab
                today={today}
                rooms={rooms}
                arrivals={arrivals}
                departures={departures}
                allBookings={allBookings}
                outletRevenue={outletRevenue}
              />
            )}
            {activeTab === "restaurant" && (
              <FnBTab
                outlet="restaurant"
                allOrders={restaurantOrders}
                todayOrders={todayOrders}
                outletRevenue={outletRevenue}
                menuCount={null}
              />
            )}
            {activeTab === "cafe" && (
              <FnBTab
                outlet="cafe"
                allOrders={cafeOrders}
                todayOrders={todayOrders}
                outletRevenue={outletRevenue}
                menuCount={cafeMenu.filter((m: any) => m.isAvailable).length}
              />
            )}
            {activeTab === "banquet" && (
              <BanquetTab
                halls={halls}
                allBanquetBookings={allBanquetBookings}
                outletRevenue={outletRevenue}
                today={today}
              />
            )}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}
