"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Download, TrendingUp, Users, Home, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { DesktopTopbar } from "@/components/Topbar";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { format } from "date-fns";

const DEFAULT_SPARK = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const today = format(new Date(), "yyyy-MM-dd");
  const year = format(new Date(), "yyyy");

  const summaryStats = useQuery(api.reports.getSummaryStats, { today, year });
  const yearlyReport = useQuery(api.reports.getYearlyReport, { year });
  const occupancyTrend = useQuery(api.reports.getOccupancyTrend, { today });

  const chartRevenueData = yearlyReport?.map(m => {
    const d = new Date(m.month + "-01");
    return { 
      name: d.toLocaleDateString("en-US", { month: "short" }), 
      rooms: m.rooms, 
      restaurant: m.restaurant + m.cafe, 
      banquets: m.banquet 
    };
  }) || [];

  const chartOccupancyData = occupancyTrend || [];

  // Trend calculation helpers
  const getTrend = (data: number[]) => {
    if (!data || data.length < 2) return 0;
    const last = data[data.length - 1];
    const prev = data[data.length - 2];
    if (prev === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - prev) / prev) * 100);
  };

  return (
    <div className="flex flex-col min-h-full">
      <DesktopTopbar title="Analytics & Reports" />

      <div className="p-5 lg:p-6 space-y-5 max-w-7xl mx-auto w-full pb-24 lg:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Analytics & Reports</h1>
            <p className="text-sm text-gray-500 mt-0.5">Year-to-date performance overview</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 rounded-xl border-gray-200 text-gray-600 hover:text-green-700 hover:border-green-200 text-sm">
              <Download size={15} /> PDF
            </Button>
            <Button variant="outline" className="gap-2 rounded-xl border-gray-200 text-gray-600 hover:text-green-700 hover:border-green-200 text-sm">
              <Download size={15} /> Excel
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="YTD Revenue" 
            value={summaryStats?.ytdRevenue ?? 0} 
            prefix="₹"
            icon={TrendingUp} iconBg="#DCFCE7" iconColor="#16A34A"
            sparkData={summaryStats?.sparklines.revenue || DEFAULT_SPARK} 
            sparkColor="#16A34A" 
            trend={getTrend(summaryStats?.sparklines.revenue || [])} 
            delay={0.05}
          />
          <StatCard
            label="Avg Stay (nights)" 
            value={summaryStats?.avgStay ?? 0}
            icon={Users} iconBg="#DBEAFE" iconColor="#2563EB"
            sparkData={summaryStats?.sparklines.guests || DEFAULT_SPARK} 
            sparkColor="#2563EB" 
            trend={getTrend(summaryStats?.sparklines.guests || [])} 
            delay={0.1}
          />
          <StatCard
            label="Avg Occupancy" 
            value={`${summaryStats?.avgOccupancy ?? 0}%`} 
            suffix=""
            icon={Home} iconBg="#FEF3C7" iconColor="#D97706"
            sparkData={summaryStats?.sparklines.occupancy || DEFAULT_SPARK} 
            sparkColor="#D97706" 
            trend={getTrend(summaryStats?.sparklines.occupancy || [])} 
            delay={0.15}
          />
          <StatCard
            label="Total Events" 
            value={summaryStats?.totalEvents ?? 0}
            icon={Calendar} iconBg="#EDE9FE" iconColor="#7C3AED"
            sparkData={summaryStats?.sparklines.events || DEFAULT_SPARK} 
            sparkColor="#7C3AED" 
            trend={getTrend(summaryStats?.sparklines.events || [])} 
            delay={0.2}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-4">
          {/* Revenue Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-bold text-gray-900 mb-1">Revenue by Segment</p>
            <p className="text-xs text-gray-500 mb-4">Monthly breakdown · Jan – Jun 2026</p>
            <div className="h-[270px] relative w-full overflow-hidden">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={chartRevenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} tickFormatter={v => `₹${v / 1000}k`} />
                  <Tooltip
                    cursor={{ fill: "rgba(22,163,74,0.04)", radius: 8 }}
                    contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 13 }}
                    formatter={(v: any, name: any) => [`₹${Number(v).toLocaleString("en-IN")}`, name]}
                  />
                  <Bar dataKey="rooms" name="Rooms" stackId="a" fill="#16A34A" radius={[0,0,0,0]} />
                  <Bar dataKey="banquets" name="Banquets" stackId="a" fill="#2563EB" />
                  <Bar dataKey="restaurant" name="Restaurant" stackId="a" fill="#D97706" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            {/* Legend */}
            <div className="flex gap-4 mt-3 justify-center">
              {[["#16A34A","Rooms"],["#2563EB","Banquets"],["#D97706","Restaurant"]].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: c }} />
                  {l}
                </div>
              ))}
            </div>
          </div>

          {/* Occupancy Trend */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-bold text-gray-900 mb-1">30-Day Occupancy Trend</p>
            <p className="text-xs text-gray-500 mb-4">This month's occupancy rate (%) by date</p>
            <div className="h-[270px] relative w-full overflow-hidden">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={chartOccupancyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="occ" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16A34A" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 13 }}
                    formatter={(v: any) => [`${v}%`, "Occupancy"]}
                  />
                  <Area type="monotone" dataKey="rate" name="Occupancy" stroke="#16A34A" strokeWidth={2.5} fill="url(#occ)" dot={{ r: 3, fill: "#16A34A" }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
