"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { BedDouble, CheckCircle2, IndianRupee, LogOut, CalendarCheck, ArrowUpRight } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { DesktopTopbar } from "@/components/Topbar";
import { TODAY_DATA } from "@/lib/adminDummyData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from "recharts";
import { motion } from "framer-motion";

const WEEK_REVENUE = [
  { day: "Sat", v: 12000 }, { day: "Sun", v: 18000 }, { day: "Mon", v: 9000 },
  { day: "Tue", v: 22000 }, { day: "Wed", v: 17000 }, { day: "Thu", v: 25000 },
  { day: "Fri", v: 21000 },
];

const SPARK_BOOKINGS   = [8, 10, 7, 14, 12, 16, 11, 18, 15, 19];
const SPARK_AVAILABLE  = [12, 10, 13, 9, 11, 8, 10, 7, 9, 8];
const SPARK_CHECKIN    = [3, 5, 2, 6, 4, 7, 5, 8, 6, 9];
const SPARK_CHECKOUT   = [2, 3, 4, 2, 5, 3, 4, 6, 4, 5];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const today = format(new Date(), "yyyy-MM-dd");
  const rooms = useQuery(api.rooms.getAllRooms) || [];
  const arrivals = useQuery(api.bookings.getTodayArrivals, { today }) || [];
  const departures = useQuery(api.bookings.getTodayDepartures, { today }) || [];
  const allBookings = useQuery(api.bookings.getAllBookings) || [];
  const dashboardStats = useQuery(api.reports.getDashboardStats, { today });
  const weeklyRevenueData = useQuery(api.reports.getWeeklyRevenue, { today });

  const occupied  = rooms.filter(r => r.status === "occupied").length;
  const available = rooms.filter(r => r.status === "available").length;
  const pending   = rooms.filter(r => r.status === "pending_checkout").length;
  const todayRevenue = dashboardStats?.todayRevenue || TODAY_DATA.revenue.total;

  return (
    <div className="flex flex-col min-h-full">
      {/* Desktop Topbar */}
      <DesktopTopbar title="Dashboard" />

      <div className="p-5 lg:p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}, Admin! 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(new Date(), "EEEE, d MMMM yyyy")} · Here's what's happening at Shyam Hotel today.
          </p>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="New Bookings Today"
            value={arrivals.length}
            icon={CalendarCheck}
            iconBg="#DCFCE7" iconColor="#16A34A"
            sparkData={SPARK_BOOKINGS} sparkColor="#16A34A"
            trend={12} delay={0.05}
          />
          <StatCard
            label="Available Rooms"
            value={available}
            icon={BedDouble}
            iconBg="#FEF3C7" iconColor="#D97706"
            sparkData={SPARK_AVAILABLE} sparkColor="#D97706"
            delay={0.1}
          />
          <StatCard
            label="Check Ins"
            value={arrivals.length}
            icon={CheckCircle2}
            iconBg="#DBEAFE" iconColor="#2563EB"
            sparkData={SPARK_CHECKIN} sparkColor="#2563EB"
            trend={5} delay={0.15}
          />
          <StatCard
            label="Check Outs"
            value={departures.length}
            icon={LogOut}
            iconBg="#FEE2E2" iconColor="#DC2626"
            sparkData={SPARK_CHECKOUT} sparkColor="#DC2626"
            delay={0.2}
          />
        </div>

        {/* Main Grid — Chart + Activity + Bookings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Revenue Chart — 2 cols */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="lg:col-span-2 bg-card rounded-2xl shadow-sm border border-gray-100 p-5"
          >
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Revenue Stat</p>
                <p className="text-3xl font-bold text-gray-900 tabular-nums mt-1">
                  ₹{todayRevenue.toLocaleString("en-IN")}
                </p>
              </div>
              <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-lg">↑ 14%</span>
            </div>
            <div className="h-[200px] mt-4 min-h-0 min-w-0">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={weeklyRevenueData || WEEK_REVENUE} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={26}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} tickFormatter={v => `₹${v/1000}k`} />
                  <Tooltip
                    cursor={{ fill: "rgba(22,163,74,0.05)", radius: 8 }}
                    contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 13 }}
                    formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]}
                  />
                  <Bar dataKey="v" fill="#16A34A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Bookings Summary — 1 col */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Bookings</p>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{allBookings.length.toLocaleString("en-IN")}</p>
            <p className="text-xs text-gray-500 mt-0.5 mb-4">Total Bookings</p>

            {/* Stacked bar */}
            <div className="flex rounded-full overflow-hidden h-2.5 mb-3 gap-0.5">
              <div className="bg-green-500 flex-1" title="Online" />
              <div className="bg-amber-400" style={{ width: "38%" }} title="Walk-in" />
            </div>
            <div className="flex justify-between text-sm mb-5">
              <div>
                <p className="font-bold text-gray-900 tabular-nums">{occupied}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  <span className="text-xs text-gray-500">Occupied</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 tabular-nums">{available}</p>
                <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  <span className="text-xs text-gray-500">Available</span>
                </div>
              </div>
            </div>

            <div className="flex-1" />
            
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 font-medium">Arrivals Today</span>
                <span className="text-sm font-bold text-green-600 tabular-nums">{arrivals.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 font-medium">Departures Today</span>
                <span className="text-sm font-bold text-amber-600 tabular-nums">{departures.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 font-medium">Pending Checkout</span>
                <span className="text-sm font-bold text-red-600 tabular-nums">{pending}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Grid — Activity + Departures */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-4">
          {/* Recent Arrivals */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-900">Recent Activities</p>
              <button className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700">
                View all <ArrowUpRight size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {arrivals.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No arrivals today.</p>
              ) : (
                arrivals.slice(0, 4).map((g, i) => (
                  <div key={g._id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm shrink-0">
                      {g.guestName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{g.guestName}</p>
                      <p className="text-xs text-gray-500">Check-in · Room booked</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{format(new Date(g.checkIn), "h:mm a")}</span>
                  </div>
                ))
              )}
              {TODAY_DATA.recentTransactions.slice(0, 3 - Math.min(arrivals.length, 3)).map((tx, i) => (
                <div key={tx.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <IndianRupee size={16} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{tx.description}</p>
                    <p className="text-xs text-gray-500">₹{tx.amount.toLocaleString("en-IN")}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{tx.time}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Departures */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-900">Departures Today</p>
              <button className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700">
                View all <ArrowUpRight size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {departures.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No departures today.</p>
              ) : (
                departures.map((g, i) => (
                  <div key={g._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                      {g.guestName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{g.guestName}</p>
                      <p className="text-xs text-gray-500">Checkout · {g.checkOut}</p>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg shrink-0">
                      PENDING
                    </span>
                  </div>
                ))
              )}
              {departures.length === 0 && TODAY_DATA.departures.map((d, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                    {d.guest[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{d.guest}</p>
                    <p className="text-xs text-gray-500">Room {d.room} · {d.time}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg shrink-0">
                    PENDING
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
