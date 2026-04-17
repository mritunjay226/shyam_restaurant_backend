"use client";

import { useState, useEffect, Fragment } from "react";
import { format, differenceInDays, parseISO } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Printer, CreditCard, Banknote, Smartphone, BedDouble, IndianRupee, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { DesktopTopbar } from "@/components/Topbar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "upi", label: "UPI", icon: Smartphone },
];

// ─── Thermal Print Styles ────────────────────────────────────────────────────
// Injected once into <head> so they're available at print time.
const THERMAL_PRINT_STYLES = `
@media print {
  /* Hide everything except the receipt */
  body * { visibility: hidden !important; }
  #thermal-receipt, #thermal-receipt * { visibility: visible !important; }

  /* Remove all page margins / chrome */
  @page {
    size: 80mm auto;   /* 80 mm wide, auto height — change to 58mm for narrow roll */
    margin: 0;
  }

  #thermal-receipt {
    position: fixed;
    top: 0;
    left: 0;
    width: 80mm;          /* match @page size */
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    line-height: 1.4;
    color: #000 !important;
    background: #fff !important;
    padding: 4mm 3mm;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }

  /* Hide the screen-only badge/logo wrapper */
  #thermal-receipt .screen-logo { display: none !important; }

  /* Force every element in receipt to black on white */
  #thermal-receipt * {
    color: #000 !important;
    background: transparent !important;
    border-color: #000 !important;
    box-shadow: none !important;
    text-shadow: none !important;
  }

  /* Separator lines become dashed for thermal */
  #thermal-receipt hr,
  #thermal-receipt .thermal-divider {
    border: none !important;
    border-top: 1px dashed #000 !important;
    margin: 3px 0 !important;
  }

  /* Table layout tightened */
  #thermal-receipt table {
    width: 100% !important;
    border-collapse: collapse !important;
    font-size: 10px !important;
  }
  #thermal-receipt th,
  #thermal-receipt td {
    padding: 1px 2px !important;
  }

  /* Total row stands out */
  #thermal-receipt .thermal-total-row {
    font-size: 13px !important;
    font-weight: bold !important;
    border-top: 1px solid #000 !important;
    padding-top: 3px !important;
  }

  /* Center helpers */
  #thermal-receipt .thermal-center { text-align: center !important; }
  #thermal-receipt .thermal-right  { text-align: right  !important; }
}
`;

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<"rooms" | "tables">("rooms");
  const settings = useQuery(api.settings.getHotelSettings);

  const roomGstRate = (settings?.roomGst || 12) / 100;
  const foodGstRate = (settings?.foodGst || 5) / 100;

  // Inject thermal print styles once
  useEffect(() => {
    const id = "thermal-print-styles";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.innerHTML = THERMAL_PRINT_STYLES;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (settings?.defaultBillingTab === "tables" || settings?.defaultBillingTab === "rooms") {
      setActiveTab(settings.defaultBillingTab);
    }
  }, [settings?.defaultBillingTab]);

  const [activeRoomId, setActiveRoomId] = useState<Id<"rooms"> | null>(null);
  const [activeTableKey, setActiveTableKey] = useState<string | null>(null);
  const [includeGST, setIncludeGST] = useState(false);
  const [includeFoodGST, setIncludeFoodGST] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [serviceCharge, setServiceCharge] = useState<number>(0);
  const [housekeepingCharge, setHousekeepingCharge] = useState<number>(0);
  const [extraCharge, setExtraCharge] = useState<number>(0);
  const [useSplitPayment, setUseSplitPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState<{ method: string; amount: number }[]>([
    { method: "cash", amount: 0 },
    { method: "card", amount: 0 },
  ]);

  const rooms = useQuery(api.rooms.getAllRooms, {}) || [];
  const bookings = useQuery(api.bookings.getAllBookings) || [];
  const orders = useQuery(api.orders.getAllOrders) || [];
  const tableOrders = useQuery(api.orders.getUnbilledTableOrders) || [];

  const generateRoomBill = useMutation(api.billing.generateRoomBill);
  const checkOutBooking = useMutation(api.bookings.checkOut);
  const generateTableBill = useMutation(api.billing.generateTableBill);

  const occupiedRooms = rooms.filter((r) => r.status === "occupied" || r.status === "pending_checkout");

  const activeTablesMap = tableOrders.reduce(
    (acc, order) => {
      const key = `${order.outlet}:${order.tableNumber}`;
      if (!acc[key])
        acc[key] = { outlet: order.outlet, tableNumber: order.tableNumber, total: 0, count: 0, orders: [] };
      acc[key].total += order.totalAmount;
      acc[key].count += 1;
      acc[key].orders.push(order);
      return acc;
    },
    {} as Record<string, { outlet: string; tableNumber: string; total: number; count: number; orders: any[] }>
  );

  const activeTablesList = Object.values(activeTablesMap);

  const getActiveBooking = (roomId: Id<"rooms">) =>
    bookings.find((b) => b.roomId === roomId && (b.status === "checked_in" || b.status === "confirmed"));

  const getCharges = (roomId: Id<"rooms">) => {
    const r = rooms.find((rm) => rm._id === roomId);
    const b = getActiveBooking(roomId);
    if (!r || !b) return null;

    let nights = differenceInDays(new Date(), parseISO(b.checkIn));
    if (nights === 0) nights = 1;

    const roomBaseTotal = b.tariff * nights;
    const extraBedTotal = b.extraBed ? 500 * nights : 0;

    let roomSubtotal = roomBaseTotal + extraBedTotal + serviceCharge + housekeepingCharge + extraCharge;
    roomSubtotal = Math.max(0, roomSubtotal - discountAmount);

    const roomCgst = includeGST ? Math.round(roomSubtotal * (roomGstRate / 2)) : 0;
    const roomSgst = includeGST ? Math.round(roomSubtotal * (roomGstRate / 2)) : 0;

    const linkedOrders = orders.filter((o) => o.roomId === roomId && o.status !== "paid");
    let restaurantTotal = 0,
      cafeTotal = 0,
      foodGstTotal = 0;

    linkedOrders.forEach((o) => {
      const orderSubtotal = o.subtotal || 0;
      const orderGst = o.gstAmount || 0;
      if (o.outlet === "restaurant") restaurantTotal += orderSubtotal;
      if (o.outlet === "cafe") cafeTotal += orderSubtotal;
      if (includeFoodGST) foodGstTotal += orderGst;
    });

    const totalOrderSubtotal = restaurantTotal + cafeTotal;
    const cgst = roomCgst + foodGstTotal / 2;
    const sgst = roomSgst + foodGstTotal / 2;
    const grandTotal = roomSubtotal + totalOrderSubtotal + cgst + sgst;

    return {
      room: r,
      booking: b,
      nights,
      roomBaseTotal,
      roomSubtotal,
      restaurantTotal,
      cafeTotal,
      subtotal: roomSubtotal + totalOrderSubtotal,
      cgst,
      sgst,
      grandTotal,
      extraBedTotal,
      linkedOrders,
    };
  };

  const handleCheckout = async () => {
    if (!activeRoomId) return;
    const c = getCharges(activeRoomId);
    if (!c?.booking) return;
    setIsSubmitting(true);
    try {
      await generateRoomBill({
        bookingId: c.booking._id,
        isGstBill: includeGST,
        includeFoodGst: includeFoodGST,
        paymentMethod: useSplitPayment ? "split" : paymentMethod,
        discountAmount,
        serviceCharge,
        housekeepingCharge,
        extraCharge,
        splitPayments: useSplitPayment ? splitPayments.filter((s) => s.amount > 0) : undefined,
      });
      await checkOutBooking({
        bookingId: c.booking._id,
        paymentMethod: useSplitPayment ? "split" : paymentMethod,
      });
      toast.success("Checkout successful! Invoice generated.");
      setActiveRoomId(null);
    } catch (e: any) {
      toast.error("Checkout failed: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBillTable = async () => {
    if (!activeTableKey) return;
    const [outlet, tableNumber] = activeTableKey.split(":");
    setIsSubmitting(true);
    try {
      await generateTableBill({
        outlet,
        tableNumber,
        isGstBill: includeGST,
        includeFoodGst: includeFoodGST,
        paymentMethod: useSplitPayment ? "split" : paymentMethod,
        discountAmount,
        serviceCharge,
        housekeepingCharge,
        extraCharge,
        splitPayments: useSplitPayment ? splitPayments.filter((s) => s.amount > 0) : undefined,
      });
      toast.success(`Table ${tableNumber} billed successfully!`);
      setActiveTableKey(null);
      setDiscountAmount(0);
      setServiceCharge(0);
      setHousekeepingCharge(0);
      setExtraCharge(0);
      setUseSplitPayment(false);
    } catch (e: any) {
      toast.error("Billing failed: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentRoomCharges = activeRoomId ? getCharges(activeRoomId) : null;
  const currentTableCharges = activeTableKey ? activeTablesMap[activeTableKey] : null;

  const tableBaseTotal = currentTableCharges?.total || 0;
  const tableSubtotal = Math.max(
    0,
    tableBaseTotal + serviceCharge + housekeepingCharge + extraCharge - discountAmount
  );
  const tableCgst =
    includeGST && includeFoodGST ? Math.round(tableSubtotal * (foodGstRate / 2)) : 0;
  const tableSgst =
    includeGST && includeFoodGST ? Math.round(tableSubtotal * (foodGstRate / 2)) : 0;
  const tableGrandTotal = tableSubtotal + tableCgst + tableSgst;

  const currentGrandTotal = activeRoomId
    ? currentRoomCharges?.grandTotal || 0
    : tableGrandTotal;
  const splitTotal = splitPayments.reduce((acc, curr) => acc + curr.amount, 0);
  const isSplitValid = Math.abs(currentGrandTotal - splitTotal) < 1;
  const buttonDisabled = isSubmitting || (useSplitPayment && !isSplitValid);

  // ── Invoice number helper (simple timestamp-based) ──────────────────────────
  const invoiceNumber = `SP-${format(new Date(), "yyyyMMdd-HHmm")}`;

  // ── Outlet display name ─────────────────────────────────────────────────────
  const outletName = (outlet?: string) => {
    if (!outlet) return "";
    if (outlet === "restaurant") return "Restaurant";
    if (outlet === "cafe") return "Café";
    return outlet
      .replace(/shyam-/i, "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="flex flex-col min-h-full">
      <DesktopTopbar
        title={
          activeRoomId && currentRoomCharges
            ? `Room ${currentRoomCharges.room.roomNumber} — Checkout`
            : activeTableKey && currentTableCharges
            ? `Table ${currentTableCharges.tableNumber} — Billing`
            : "Billing & Checkout"
        }
      />

      <div className="p-5 lg:p-6 max-w-5xl mx-auto w-full pb-24 lg:pb-6">
        <AnimatePresence mode="popLayout">
          {/* ── Selection View ── */}
          {!activeRoomId && !activeTableKey && (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Billing & Checkout</h1>
                  <p className="text-sm text-gray-500 mt-0.5">Select a service to generate final bill</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl shrink-0 horizontal-scroll max-w-full">
                  <button
                    onClick={() => setActiveTab("rooms")}
                    className={cn(
                      "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                      activeTab === "rooms"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    Rooms
                  </button>
                  <button
                    onClick={() => setActiveTab("tables")}
                    className={cn(
                      "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                      activeTab === "tables"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    Table Service
                  </button>
                </div>
              </div>

              {activeTab === "rooms" ? (
                occupiedRooms.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <BedDouble size={24} className="text-gray-400" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">No rooms currently occupied</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        All rooms are available or already checked out.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {occupiedRooms.map((room) => {
                      const b = getActiveBooking(room._id);
                      if (!b) return null;
                      const isPending = room.status === "pending_checkout";
                      return (
                        <button
                          key={room._id}
                          onClick={() => setActiveRoomId(room._id)}
                          className={cn(
                            "bg-white rounded-2xl border shadow-sm text-left p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5",
                            isPending ? "border-amber-300" : "border-gray-100"
                          )}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                                <BedDouble size={18} className="text-gray-500" />
                              </div>
                              <div>
                                <p className="text-base font-bold text-gray-900 tabular-nums">
                                  #{room.roomNumber}
                                </p>
                                <p className="text-xs text-gray-400 capitalize">{room.category}</p>
                              </div>
                            </div>
                            {isPending && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase">
                                Checkout
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                              <User size={13} className="text-green-700" />
                            </div>
                            <p className="text-sm font-semibold text-gray-800">{b.guestName}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">Check-in: {b.checkIn}</p>
                            <p className="text-sm font-bold text-gray-900 tabular-nums flex items-center gap-0.5">
                              <IndianRupee size={12} />
                              {b.tariff.toLocaleString("en-IN")}
                              <span className="text-xs font-normal text-gray-400">/nt</span>
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )
              ) : activeTablesList.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <Smartphone size={24} className="text-gray-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">No active tables</p>
                    <p className="text-sm text-gray-500 mt-0.5">All tables are currently clear or paid.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeTablesList.map((table) => (
                    <button
                      key={`${table.outlet}:${table.tableNumber}`}
                      onClick={() => setActiveTableKey(`${table.outlet}:${table.tableNumber}`)}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm text-left p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                            <span className="font-black text-indigo-600">T</span>
                          </div>
                          <div>
                            <p className="text-base font-bold text-gray-900 tabular-nums">
                              Table {table.tableNumber}
                            </p>
                            <p className="text-xs text-gray-400 font-medium">{outletName(table.outlet)}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase">
                          {table.count} KOTs
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                        <p className="text-xs text-gray-400 font-medium">Pending Dues</p>
                        <p className="text-lg font-black text-gray-900 tabular-nums">
                          ₹{table.total.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Bill Detail ── */}
          {(activeRoomId || activeTableKey) && (
            <motion.div
              key="billing"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <button
                onClick={() => {
                  setActiveRoomId(null);
                  setActiveTableKey(null);
                }}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors print:hidden"
              >
                <ChevronLeft size={18} /> Back to selection
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* ── Controls (hidden when printing) ── */}
                <div className="lg:col-span-2 space-y-4 print:hidden">
                  {/* GST Toggles */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Include Room GST</p>
                        <p className="text-xs text-gray-500 mt-0.5">Room tax @ {roomGstRate * 100}%</p>
                      </div>
                      <Switch checked={includeGST} onCheckedChange={setIncludeGST} />
                    </div>
                    <div className="h-px bg-gray-50" />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Include Food GST</p>
                        <p className="text-xs text-gray-500 mt-0.5">F&B tax @ {foodGstRate * 100}%</p>
                      </div>
                      <Switch checked={includeFoodGST} onCheckedChange={setIncludeFoodGST} />
                    </div>
                  </div>

                  {/* Modifiers */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-bold text-gray-900 block mb-2">Discount (₹)</Label>
                        <input
                          type="number"
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
                          value={discountAmount || ""}
                          onChange={(e) => setDiscountAmount(Number(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-bold text-gray-900 block mb-2">Service (₹)</Label>
                        <input
                          type="number"
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
                          value={serviceCharge || ""}
                          onChange={(e) => setServiceCharge(Number(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {activeRoomId && (
                        <div>
                          <Label className="text-sm font-bold text-gray-900 block mb-2">
                            Housekeeping (₹)
                          </Label>
                          <input
                            type="number"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
                            value={housekeepingCharge || ""}
                            onChange={(e) => setHousekeepingCharge(Number(e.target.value))}
                            placeholder="0"
                          />
                        </div>
                      )}
                      <div className={cn(!activeRoomId && "col-span-2")}>
                        <Label className="text-sm font-bold text-gray-900 block mb-2">Extra Charge (₹)</Label>
                        <input
                          type="number"
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
                          value={extraCharge || ""}
                          onChange={(e) => setExtraCharge(Number(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        Payment Method
                      </p>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs border border-gray-200 px-2 py-1 rounded bg-gray-50">
                          Split Billing
                        </Label>
                        <Switch checked={useSplitPayment} onCheckedChange={setUseSplitPayment} />
                      </div>
                    </div>
                    {!useSplitPayment ? (
                      <div className="grid grid-cols-3 gap-2">
                        {PAYMENT_METHODS.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setPaymentMethod(m.id)}
                            className={cn(
                              "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                              paymentMethod === m.id
                                ? "border-green-500 bg-green-50 text-green-700"
                                : "border-gray-100 text-gray-500 hover:border-gray-200"
                            )}
                          >
                            <m.icon size={20} />
                            <span className="text-xs font-bold">{m.label}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {splitPayments.map((sp, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <select
                              className="border border-gray-200 rounded p-2 text-sm flex-1 bg-white focus:outline-none focus:border-indigo-500"
                              value={sp.method}
                              onChange={(e) => {
                                const n = [...splitPayments];
                                n[idx].method = e.target.value;
                                setSplitPayments(n);
                              }}
                            >
                              <option value="cash">Cash</option>
                              <option value="card">Card</option>
                              <option value="upi">UPI</option>
                              <option value="room">To Room</option>
                            </select>
                            <input
                              type="number"
                              className="border border-gray-200 rounded p-2 text-sm w-24 focus:outline-none focus:border-indigo-500"
                              placeholder="Amount"
                              value={sp.amount || ""}
                              onChange={(e) => {
                                const n = [...splitPayments];
                                n[idx].amount = Number(e.target.value);
                                setSplitPayments(n);
                              }}
                            />
                          </div>
                        ))}
                        <button
                          onClick={() =>
                            setSplitPayments([...splitPayments, { method: "cash", amount: 0 }])
                          }
                          className="text-xs text-indigo-600 font-bold hover:underline"
                        >
                          + Add Split
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <Button
                      className="w-full h-11 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold gap-2"
                      onClick={() => window.print()}
                    >
                      <Printer size={18} /> Print Receipt
                    </Button>
                    <Button
                      disabled={buttonDisabled}
                      variant="outline"
                      className={cn(
                        "w-full h-11 rounded-xl font-semibold transition-all",
                        buttonDisabled
                          ? "bg-gray-100 text-gray-400 border-gray-100"
                          : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                      )}
                      onClick={activeRoomId ? handleCheckout : handleBillTable}
                    >
                      {isSubmitting
                        ? "Processing…"
                        : activeRoomId
                        ? "Confirm Check-out"
                        : "Confirm Payment"}
                    </Button>
                    {useSplitPayment && !isSplitValid && (
                      <p className="text-[10px] text-red-500 font-bold text-center mt-1 animate-pulse">
                        Split sum (₹{splitTotal}) must equal total (₹{Math.round(currentGrandTotal)})
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Thermal Receipt Preview ── */}
                {/*
                  On-screen: shown inside a styled card at natural width.
                  On print:  @media print targets #thermal-receipt and formats it
                             as an 80 mm thermal slip.
                */}
                <div className="lg:col-span-3">
                  {/* Screen wrapper — hidden in print, provides the card look */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 print:hidden">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                      Receipt Preview (80 mm thermal)
                    </p>
                    {/* inner preview scaled down to mimic 80 mm feel */}
                    <div className="mx-auto border border-dashed border-gray-200 rounded p-3"
                         style={{ maxWidth: 320, fontFamily: "'Courier New', monospace", fontSize: 12, lineHeight: 1.5 }}>
                      <ThermalReceiptContent
                        settings={settings}
                        invoiceNumber={invoiceNumber}
                        activeRoomId={activeRoomId}
                        currentRoomCharges={currentRoomCharges}
                        currentTableCharges={currentTableCharges}
                        paymentMethod={useSplitPayment ? "split" : paymentMethod}
                        splitPayments={useSplitPayment ? splitPayments : undefined}
                        includeGST={includeGST}
                        includeFoodGST={includeFoodGST}
                        discountAmount={discountAmount}
                        serviceCharge={serviceCharge}
                        housekeepingCharge={housekeepingCharge}
                        extraCharge={extraCharge}
                        tableSubtotal={tableSubtotal}
                        tableCgst={tableCgst}
                        tableSgst={tableSgst}
                        tableGrandTotal={tableGrandTotal}
                        roomGstRate={roomGstRate}
                        foodGstRate={foodGstRate}
                        outletName={outletName}
                      />
                    </div>
                  </div>

                  {/* The ACTUAL printable element — invisible on screen, printed by @media print */}
                  <div id="thermal-receipt" style={{ display: "none" }}>
                    <ThermalReceiptContent
                      settings={settings}
                      invoiceNumber={invoiceNumber}
                      activeRoomId={activeRoomId}
                      currentRoomCharges={currentRoomCharges}
                      currentTableCharges={currentTableCharges}
                      paymentMethod={useSplitPayment ? "split" : paymentMethod}
                      splitPayments={useSplitPayment ? splitPayments : undefined}
                      includeGST={includeGST}
                      includeFoodGST={includeFoodGST}
                      discountAmount={discountAmount}
                      serviceCharge={serviceCharge}
                      housekeepingCharge={housekeepingCharge}
                      extraCharge={extraCharge}
                      tableSubtotal={tableSubtotal}
                      tableCgst={tableCgst}
                      tableSgst={tableSgst}
                      tableGrandTotal={tableGrandTotal}
                      roomGstRate={roomGstRate}
                      foodGstRate={foodGstRate}
                      outletName={outletName}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── ThermalReceiptContent ────────────────────────────────────────────────────
// Pure presentational component — rendered twice:
//   1. Inside the screen preview (styled div)
//   2. Inside #thermal-receipt (targeted by @media print)

interface ThermalProps {
  settings: any;
  invoiceNumber: string;
  activeRoomId: any;
  currentRoomCharges: any;
  currentTableCharges: any;
  paymentMethod: string;
  splitPayments?: { method: string; amount: number }[];
  includeGST: boolean;
  includeFoodGST: boolean;
  discountAmount: number;
  serviceCharge: number;
  housekeepingCharge: number;
  extraCharge: number;
  tableSubtotal: number;
  tableCgst: number;
  tableSgst: number;
  tableGrandTotal: number;
  roomGstRate: number;
  foodGstRate: number;
  outletName: (outlet?: string) => string;
}

function ThermalReceiptContent({
  settings,
  invoiceNumber,
  activeRoomId,
  currentRoomCharges,
  currentTableCharges,
  paymentMethod,
  splitPayments,
  includeGST,
  includeFoodGST,
  discountAmount,
  serviceCharge,
  housekeepingCharge,
  extraCharge,
  tableSubtotal,
  tableCgst,
  tableSgst,
  tableGrandTotal,
  roomGstRate,
  foodGstRate,
  outletName,
}: ThermalProps) {
  const now = new Date();

  // ── small helpers ──────────────────────────────────────────────────────────
  const divider = (char = "-") => (
    <div className="thermal-divider" style={{ borderTop: `1px dashed #000`, margin: "4px 0" }} />
  );

  const row = (label: string, value: string, bold = false) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontWeight: bold ? "bold" : "normal",
        fontSize: bold ? 13 : 11,
        marginBottom: 1,
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );

  const tableRow = (desc: string, qty: string, rate: string, amt: string) => (
    <tr>
      <td style={{ paddingRight: 4, wordBreak: "break-word" }}>{desc}</td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{qty}</td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{rate}</td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap", fontWeight: "bold" }}>{amt}</td>
    </tr>
  );

  const hotelName = settings?.hotelName || "Sarovar Palace";
  const address = settings?.address || "Civil Lines, Prayagraj";
  const phone = settings?.phone || "";
  const gstin = settings?.gstin || "09AABCU9603R1ZN";

  return (
    <div style={{ color: "#000", background: "#fff" }}>
      {/* ── Header ── */}
      <div className="thermal-center" style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 16, fontWeight: "bold", letterSpacing: 1 }}>{hotelName.toUpperCase()}</div>
        <div style={{ fontSize: 10 }}>{address}</div>
        {phone && <div style={{ fontSize: 10 }}>Tel: {phone}</div>}
        {includeGST && <div style={{ fontSize: 10 }}>GSTIN: {gstin}</div>}
      </div>

      {divider("=")}

      {/* ── Bill type label ── */}
      <div
        className="thermal-center"
        style={{ textAlign: "center", fontWeight: "bold", fontSize: 12, marginBottom: 4 }}
      >
        {includeGST ? "TAX INVOICE" : "RECEIPT"}
      </div>

      {divider()}

      {/* ── Meta ── */}
      {row("Bill No :", invoiceNumber)}
      {row("Date    :", format(now, "dd/MM/yyyy HH:mm"))}

      {activeRoomId && currentRoomCharges ? (
        <>
          {row("Guest   :", currentRoomCharges.booking.guestName)}
          {row("Room    :", `#${currentRoomCharges.room.roomNumber} (${currentRoomCharges.room.category})`)}
          {row("Check-in:", currentRoomCharges.booking.checkIn)}
          {row("Nights  :", String(currentRoomCharges.nights))}
        </>
      ) : (
        <>
          {row(
            "Service :",
            `${outletName(currentTableCharges?.outlet)} — Table ${currentTableCharges?.tableNumber}`
          )}
          {row("Type    :", "Walk-in")}
        </>
      )}
      {row("Payment :", paymentMethod.toUpperCase())}

      {divider()}

      {/* ── Items table ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #000" }}>
            <th style={{ textAlign: "left", paddingBottom: 2 }}>Item</th>
            <th style={{ textAlign: "right", paddingBottom: 2 }}>Qty</th>
            <th style={{ textAlign: "right", paddingBottom: 2 }}>Rate</th>
            <th style={{ textAlign: "right", paddingBottom: 2 }}>Amt</th>
          </tr>
        </thead>
        <tbody>
          {activeRoomId && currentRoomCharges ? (
            <>
              {tableRow(
                `Room Tariff (${currentRoomCharges.room.category})`,
                `${currentRoomCharges.nights}N`,
                `${currentRoomCharges.booking.tariff}`,
                `${currentRoomCharges.roomBaseTotal.toLocaleString("en-IN")}`
              )}

              {currentRoomCharges.booking.extraBed &&
                tableRow(
                  "Extra Bed",
                  `${currentRoomCharges.nights}N`,
                  "500",
                  `${currentRoomCharges.extraBedTotal.toLocaleString("en-IN")}`
                )}

              {currentRoomCharges.linkedOrders.length > 0 && (
                <>
                  <tr>
                    <td
                      colSpan={4}
                      style={{ paddingTop: 6, paddingBottom: 2, fontWeight: "bold", fontSize: 10 }}
                    >
                      -- Food & Beverages --
                    </td>
                  </tr>
                  {currentRoomCharges.linkedOrders.map((order: any) => (
                    <Fragment key={order._id}>
                      <tr>
                        <td
                          colSpan={3}
                          style={{ paddingTop: 3, paddingBottom: 1, fontSize: 9, fontWeight: "bold" }}
                        >
                          KOT #{order.kotNumber || order._id.slice(-4).toUpperCase()} ·{" "}
                          {order.outlet.toUpperCase()} · {format(new Date(order.createdAt), "HH:mm")}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "bold", fontSize: 9 }}>
                          {order.subtotal.toLocaleString("en-IN")}
                        </td>
                      </tr>
                      {order.items.map((item: any, iidx: number) => (
                        <tr key={iidx}>
                          <td style={{ paddingLeft: 8, fontSize: 9 }}>{item.name}</td>
                          <td style={{ textAlign: "right", fontSize: 9 }}>{item.quantity}</td>
                          <td style={{ textAlign: "right", fontSize: 9 }}>{item.price}</td>
                          <td style={{ textAlign: "right", fontSize: 9 }}>
                            {(item.quantity * item.price).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </>
              )}
            </>
          ) : (
            // Table orders
            currentTableCharges?.orders?.map((order: any) => (
              <Fragment key={order._id}>
                <tr>
                  <td
                    colSpan={3}
                    style={{ paddingTop: 3, paddingBottom: 1, fontSize: 9, fontWeight: "bold" }}
                  >
                    KOT #{order.kotNumber || order._id.slice(-4).toUpperCase()} ·{" "}
                    {format(new Date(order.createdAt), "HH:mm")}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: "bold", fontSize: 9 }}>
                    {(order.subtotal || order.totalAmount || 0).toLocaleString("en-IN")}
                  </td>
                </tr>
                {order.items?.map((item: any, iidx: number) => (
                  <tr key={iidx}>
                    <td style={{ paddingLeft: 8, fontSize: 9 }}>{item.name}</td>
                    <td style={{ textAlign: "right", fontSize: 9 }}>{item.quantity}</td>
                    <td style={{ textAlign: "right", fontSize: 9 }}>{item.price}</td>
                    <td style={{ textAlign: "right", fontSize: 9 }}>
                      {(item.quantity * item.price).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))
          )}
        </tbody>
      </table>

      {divider()}

      {/* ── Totals ── */}
      {activeRoomId && currentRoomCharges?.booking?.advance > 0 &&
        row("Advance Paid", `- Rs.${currentRoomCharges.booking.advance.toLocaleString("en-IN")}`)}
      {discountAmount > 0 && row("Discount", `- Rs.${discountAmount.toLocaleString("en-IN")}`)}
      {serviceCharge > 0 && row("Service Charge", `Rs.${serviceCharge.toLocaleString("en-IN")}`)}
      {housekeepingCharge > 0 &&
        row("Housekeeping", `Rs.${housekeepingCharge.toLocaleString("en-IN")}`)}
      {extraCharge > 0 && row("Extra Charges", `Rs.${extraCharge.toLocaleString("en-IN")}`)}

      {row(
        "Subtotal",
        `Rs.${(
          activeRoomId ? currentRoomCharges?.subtotal ?? 0 : tableSubtotal
        ).toLocaleString("en-IN")}`
      )}

      {includeGST && (
        <>
          {row(
            `CGST @ ${(roomGstRate / 2) * 100}%`,
            `Rs.${(activeRoomId ? currentRoomCharges?.cgst ?? 0 : tableCgst).toLocaleString("en-IN")}`
          )}
          {row(
            `SGST @ ${(roomGstRate / 2) * 100}%`,
            `Rs.${(activeRoomId ? currentRoomCharges?.sgst ?? 0 : tableSgst).toLocaleString("en-IN")}`
          )}
        </>
      )}

      {divider("=")}

      {/* Grand Total */}
      <div
        className="thermal-total-row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: "bold",
          fontSize: 14,
          marginBottom: 2,
        }}
      >
        <span>TOTAL PAYABLE</span>
        <span>
          Rs.
          {(activeRoomId
            ? Math.max(
                0,
                (currentRoomCharges?.grandTotal ?? 0) - (currentRoomCharges?.booking?.advance ?? 0)
              )
            : tableGrandTotal
          ).toLocaleString("en-IN")}
        </span>
      </div>

      {/* Split payment breakdown */}
      {splitPayments && splitPayments.filter((s) => s.amount > 0).length > 0 && (
        <>
          {divider()}
          {splitPayments
            .filter((s) => s.amount > 0)
            .map((s, i) => row(`  ${s.method.toUpperCase()}`, `Rs.${s.amount.toLocaleString("en-IN")}`))}
        </>
      )}

      {divider("=")}

      {/* ── Footer ── */}
      <div className="thermal-center" style={{ textAlign: "center", fontSize: 10, marginTop: 6 }}>
        <div>Thank you for your visit!</div>
        <div style={{ marginTop: 2 }}>We hope to see you again.</div>
        {includeGST && (
          <div style={{ marginTop: 4, fontSize: 9 }}>
            This is a computer generated invoice.
          </div>
        )}
        <div style={{ marginTop: 6, fontSize: 9, letterSpacing: 2 }}>* * *</div>
      </div>
    </div>
  );
}