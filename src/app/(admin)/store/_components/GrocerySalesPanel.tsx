"use client";

// ─────────────────────────────────────────────────────────────────────────────
// GrocerySalesPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Receipt, TrendingUp, Banknote, Smartphone, CreditCard, X } from "lucide-react";
import { toast } from "sonner";

const METHOD_ICON: Record<string, React.ReactNode> = {
  cash: <Banknote size={12} />,
  upi: <Smartphone size={12} />,
  card: <CreditCard size={12} />,
  credit: <Receipt size={12} />,
};

const METHOD_COLOR: Record<string, string> = {
  cash: "bg-emerald-50 text-emerald-700 border-emerald-200",
  upi: "bg-blue-50 text-blue-700 border-blue-200",
  card: "bg-purple-50 text-purple-700 border-purple-200",
  credit: "bg-amber-50 text-amber-700 border-amber-200",
};

export function GrocerySalesPanel() {
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);

  const [view, setView] = useState<"today" | "month">("today");

  const todaySales = useQuery(api.grocery.getGrocerySalesByDate, { date: today }) ?? [];
  const monthReport = useQuery(api.grocery.getGroceryMonthlyReport, { month: thisMonth });
  const voidSale = useMutation(api.grocery.voidGrocerySale);

  const sales = todaySales;
  const completedSales = sales.filter((s) => s.status === "completed");

  const todayRevenue = completedSales.reduce((a, s) => a + s.totalAmount, 0);
  const todayGST = completedSales.reduce((a, s) => a + s.gstAmount, 0);
  const todayDiscount = completedSales.reduce((a, s) => a + (s.discountAmount || 0), 0);

  // Payment breakdown
  const byMethod: Record<string, number> = {};
  for (const s of completedSales) {
    byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] ?? 0) + s.totalAmount;
  }

  const handleVoid = async (saleId: any) => {
    if (!confirm("Void this sale? Stock will be restored.")) return;
    try {
      await voidSale({ saleId, reason: "manual_void" });
      toast.success("Sale voided and stock restored");
    } catch (e: any) {
      toast.error(e.message || "Failed to void");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 scrollbar-hide">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Tab toggle ── */}
        <div className="flex items-center gap-2">
          {(["today", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                view === v
                  ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                  : "bg-white text-gray-500 border-[#E8E5DF] hover:border-gray-300"
              }`}
            >
              {v === "today" ? "Today" : "This Month"}
            </button>
          ))}
        </div>

        {view === "today" && (
          <>
            {/* ── Today summary cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Revenue", value: `₹${todayRevenue.toLocaleString()}`, color: "text-[#2D6A4F]" },
                { label: "Transactions", value: completedSales.length, color: "text-gray-900" },
                { label: "GST Collected", value: `₹${todayGST.toFixed(0)}`, color: "text-blue-600" },
                { label: "Discounts", value: `₹${todayDiscount.toFixed(0)}`, color: "text-amber-600" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white border border-[#E8E5DF] rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                  <p className={`text-xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* ── Payment method breakdown ── */}
            {Object.keys(byMethod).length > 0 && (
              <div className="bg-white border border-[#E8E5DF] rounded-2xl p-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">By Payment Method</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(byMethod).map(([method, amount]) => (
                    <div key={method} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${METHOD_COLOR[method] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
                      {METHOD_ICON[method]}
                      {method.toUpperCase()} · ₹{amount.toLocaleString()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Sales list ── */}
            <div className="bg-white border border-[#E8E5DF] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E8E5DF]">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Today's Sales</p>
              </div>
              {sales.length === 0 ? (
                <div className="py-12 text-center">
                  <Receipt size={24} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400 font-semibold">No sales today</p>
                </div>
              ) : (
                <div className="divide-y divide-[#F7F6F3]">
                  {[...sales].reverse().map((sale) => (
                    <div key={sale._id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="mono text-xs font-bold text-gray-900">{sale.receiptNumber}</span>
                          {sale.status === "voided" && (
                            <span className="text-[9px] font-black bg-red-50 text-red-500 border border-red-200 px-1.5 py-0.5 rounded-md uppercase">
                              Voided
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium">
                          {sale.customerName || "Walk-in"} ·{" "}
                          {sale.items.length} item{sale.items.length !== 1 ? "s" : ""} ·{" "}
                          {new Date(sale.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-gray-900 text-sm tabular-nums">₹{sale.totalAmount.toLocaleString()}</p>
                        <div className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md border mt-0.5 ${METHOD_COLOR[sale.paymentMethod] ?? "bg-gray-50 text-gray-500 border-gray-100"}`}>
                          {METHOD_ICON[sale.paymentMethod]}
                          {sale.paymentMethod.toUpperCase()}
                        </div>
                      </div>
                      {sale.status !== "voided" && (
                        <button
                          onClick={() => handleVoid(sale._id)}
                          className="ml-1 w-7 h-7 flex items-center justify-center rounded-xl bg-[#F7F6F3] text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
                          title="Void sale"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {view === "month" && monthReport && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Monthly Revenue", value: `₹${monthReport.totalRevenue.toLocaleString()}` },
                { label: "Transactions", value: monthReport.transactionCount },
                { label: "GST Collected", value: `₹${monthReport.totalGst.toFixed(0)}` },
              ].map((stat) => (
                <div key={stat.label} className="bg-white border border-[#E8E5DF] rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-xl font-black text-gray-900 mt-1">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Top products */}
            <div className="bg-white border border-[#E8E5DF] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E8E5DF] flex items-center gap-2">
                <TrendingUp size={14} className="text-[#2D6A4F]" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Top Products This Month</p>
              </div>
              <div className="divide-y divide-[#F7F6F3]">
                {monthReport.topProducts.map((p, idx) => (
                  <div key={p.name} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-5 text-xs font-black text-gray-300 tabular-nums">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-400">Qty: {p.qty}</p>
                    </div>
                    <span className="text-sm font-black text-gray-900 tabular-nums">₹{p.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
