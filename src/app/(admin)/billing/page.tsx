"use client";

import { useState, useEffect } from "react";
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
  { id: "upi",  label: "UPI",  icon: Smartphone },
];

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<"rooms" | "tables">("rooms");
  const settings = useQuery(api.settings.getHotelSettings);

  // Sync default tab from settings once loaded
  useEffect(() => {
    if (settings?.defaultBillingTab === "tables" || settings?.defaultBillingTab === "rooms") {
      setActiveTab(settings.defaultBillingTab);
    }
  }, [settings?.defaultBillingTab]);

  const [activeRoomId, setActiveRoomId] = useState<Id<"rooms"> | null>(null);
  const [activeTableKey, setActiveTableKey] = useState<string | null>(null); // "outlet:tableNumber"
  const [includeGST, setIncludeGST] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [serviceCharge, setServiceCharge] = useState<number>(0);
  const [housekeepingCharge, setHousekeepingCharge] = useState<number>(0);
  const [extraCharge, setExtraCharge] = useState<number>(0);
  const [useSplitPayment, setUseSplitPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState<{ method: string, amount: number }[]>([
    { method: "cash", amount: 0 },
    { method: "card", amount: 0 }
  ]);

  const rooms    = useQuery(api.rooms.getAllRooms) || [];
  const bookings = useQuery(api.bookings.getAllBookings) || [];
  const orders   = useQuery(api.orders.getAllOrders) || [];
  const tableOrders = useQuery(api.orders.getUnbilledTableOrders) || [];

  const generateRoomBill = useMutation(api.billing.generateRoomBill);
  const checkOutBooking  = useMutation(api.bookings.checkOut);
  const generateTableBill = useMutation(api.billing.generateTableBill);

  const occupiedRooms = rooms.filter(r => r.status === "occupied" || r.status === "pending_checkout");

  // Group table orders
  const activeTablesMap = tableOrders.reduce((acc, order) => {
    const key = `${order.outlet}:${order.tableNumber}`;
    if (!acc[key]) acc[key] = { outlet: order.outlet, tableNumber: order.tableNumber, total: 0, count: 0, orders: [] };
    acc[key].total += order.totalAmount;
    acc[key].count += 1;
    acc[key].orders.push(order);
    return acc;
  }, {} as Record<string, { outlet: string, tableNumber: string, total: number, count: number, orders: any[] }>);

  const activeTablesList = Object.values(activeTablesMap);

  const getActiveBooking = (roomId: Id<"rooms">) =>
    bookings.find(b => b.roomId === roomId && (b.status === "checked_in" || b.status === "confirmed"));

  const getCharges = (roomId: Id<"rooms">) => {
    const r = rooms.find(rm => rm._id === roomId);
    const b = getActiveBooking(roomId);
    if (!r || !b) return null;

    let nights = differenceInDays(new Date(), parseISO(b.checkIn));
    if (nights === 0) nights = 1;

    const roomTotal = b.tariff * nights;
    const linkedOrders = orders.filter(o => o.roomId === roomId && o.status !== "paid");
    let restaurantTotal = 0, cafeTotal = 0;
    linkedOrders.forEach(o => {
      if (o.outlet === "restaurant") restaurantTotal += o.totalAmount;
      if (o.outlet === "cafe") cafeTotal += o.totalAmount;
    });
    let subtotal  = roomTotal + restaurantTotal + cafeTotal;
    subtotal += serviceCharge + housekeepingCharge + extraCharge;
    subtotal = Math.max(0, subtotal - discountAmount);

    const cgst      = includeGST ? Math.round(subtotal * 0.06) : 0;
    const sgst      = includeGST ? Math.round(subtotal * 0.06) : 0;
    return { room: r, booking: b, nights, roomTotal, restaurantTotal, cafeTotal, subtotal, cgst, sgst, grandTotal: subtotal + cgst + sgst, linkedOrders };
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
        paymentMethod: useSplitPayment ? "split" : paymentMethod,
        discountAmount,
        serviceCharge,
        housekeepingCharge,
        extraCharge,
        splitPayments: useSplitPayment ? splitPayments.filter(s => s.amount > 0) : undefined,
      });
      await checkOutBooking({ bookingId: c.booking._id, paymentMethod: useSplitPayment ? "split" : paymentMethod });
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
        paymentMethod: useSplitPayment ? "split" : paymentMethod,
        discountAmount,
        serviceCharge,
        housekeepingCharge,
        extraCharge,
        splitPayments: useSplitPayment ? splitPayments.filter(s => s.amount > 0) : undefined,
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

  // Derived totals for Table
  const tableBaseTotal = currentTableCharges?.total || 0;
  const tableSubtotal = Math.max(0, tableBaseTotal + serviceCharge + housekeepingCharge + extraCharge - discountAmount);
  const tableCgst = includeGST ? Math.round(tableSubtotal * 0.06) : 0;
  const tableSgst = includeGST ? Math.round(tableSubtotal * 0.06) : 0;
  const tableGrandTotal = tableSubtotal + tableCgst + tableSgst;

  return (
    <div className="flex flex-col min-h-full">
      <DesktopTopbar title={
        activeRoomId && currentRoomCharges ? `Room ${currentRoomCharges.room.roomNumber} — Checkout` : 
        activeTableKey && currentTableCharges ? `Table ${currentTableCharges.tableNumber} — Billing` :
        "Billing & Checkout"
      } />

      <div className="p-5 lg:p-6 max-w-5xl mx-auto w-full pb-24 lg:pb-6">
        <AnimatePresence mode="popLayout">
          {/* ── Selection View (Rooms or Tables) ── */}
          {!activeRoomId && !activeTableKey && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
                      activeTab === "rooms" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    Rooms
                  </button>
                  <button
                    onClick={() => setActiveTab("tables")}
                    className={cn(
                      "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                      activeTab === "tables" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
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
                      <p className="text-sm text-gray-500 mt-0.5">All rooms are available or already checked out.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {occupiedRooms.map(room => {
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
                                <p className="text-base font-bold text-gray-900 tabular-nums">#{room.roomNumber}</p>
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
                              <IndianRupee size={12} />{b.tariff.toLocaleString("en-IN")}<span className="text-xs font-normal text-gray-400">/nt</span>
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                activeTablesList.length === 0 ? (
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
                    {activeTablesList.map(table => (
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
                              <p className="text-base font-bold text-gray-900 tabular-nums">Table {table.tableNumber}</p>
                              <p className="text-xs text-gray-400 capitalize">{table.outlet} Outlet</p>
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
                )
              )}
            </motion.div>
          )}

          {/* ── Bill Detail (Unified Rooms & Tables) ── */}
          {(activeRoomId || activeTableKey) && (
            <motion.div key="billing" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              {/* Back */}
              <button
                onClick={() => { setActiveRoomId(null); setActiveTableKey(null); }}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors print:hidden"
              >
                <ChevronLeft size={18} /> Back to selection
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Controls */}
                <div className="lg:col-span-2 space-y-4 print:hidden">
                  {/* GST Toggle */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Include GST</p>
                        <p className="text-xs text-gray-500 mt-0.5">12% total (6% CGST + 6% SGST)</p>
                      </div>
                      <Switch checked={includeGST} onCheckedChange={setIncludeGST} />
                    </div>
                  </div>

                  {/* Additional Modifiers */}
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
                          <Label className="text-sm font-bold text-gray-900 block mb-2">Housekeeping (₹)</Label>
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
                          placeholder="reason: amount"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Payment Method</p>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs border border-gray-200 px-2 py-1 rounded bg-gray-50">Split Billing</Label>
                        <Switch checked={useSplitPayment} onCheckedChange={setUseSplitPayment} />
                      </div>
                    </div>

                    {!useSplitPayment ? (
                      <div className="grid grid-cols-3 gap-2">
                        {PAYMENT_METHODS.map(m => (
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
                               onChange={e => {
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
                               onChange={e => {
                                 const n = [...splitPayments];
                                 n[idx].amount = Number(e.target.value);
                                 setSplitPayments(n);
                               }}
                             />
                           </div>
                         ))}
                         <button 
                           onClick={() => setSplitPayments([...splitPayments, { method: "cash", amount: 0 }])}
                           className="text-xs text-indigo-600 font-bold hover:underline"
                         >
                           + Add Split
                         </button>
                       </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button
                      className="w-full h-11 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold gap-2"
                      onClick={() => window.print()}
                    >
                      <Printer size={18} /> Print Invoice
                    </Button>
                    <Button
                      disabled={isSubmitting}
                      variant="outline"
                      className="w-full h-11 rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-semibold"
                      onClick={activeRoomId ? handleCheckout : handleBillTable}
                    >
                      {isSubmitting ? "Processing…" : activeRoomId ? "Confirm Check-out" : "Confirm Payment"}
                    </Button>
                  </div>
                </div>

                {/* Bill Preview */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 print:shadow-none print:border-none" id="printable-bill">
                  {/* Letterhead */}
                  <div className="text-center border-b border-gray-200 pb-5 mb-5">
                    <p className="text-2xl font-bold text-gray-900">Shyam Hotel</p>
                    <p className="text-xs text-gray-500 mt-1">1, Mahatma Gandhi Marg, Civil Lines, Prayagraj</p>
                    {includeGST && <p className="text-xs text-gray-500 mt-0.5">GSTIN: 09AABCU9603R1ZN</p>}
                  </div>

                  {/* Guest & Invoice Meta */}
                  <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
                    {activeRoomId && currentRoomCharges ? (
                      <>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Guest</p>
                          <p className="font-bold text-gray-900">{currentRoomCharges.booking.guestName}</p>
                          <p className="text-gray-500">Room #{currentRoomCharges.room.roomNumber} · {currentRoomCharges.room.category}</p>
                          <p className="text-gray-500 capitalize">Payment: {paymentMethod}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Invoice</p>
                          <p className="font-bold text-gray-900">{format(new Date(), "dd MMM yyyy")}</p>
                          <p className="text-gray-500">Check-in: {currentRoomCharges.booking.checkIn}</p>
                          <p className="text-gray-500">{currentRoomCharges.nights} night{currentRoomCharges.nights !== 1 ? "s" : ""}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Service</p>
                          <p className="font-bold text-gray-900 capitalize">{currentTableCharges?.outlet} Table {currentTableCharges?.tableNumber}</p>
                          <p className="text-gray-500">Walk-in Customer</p>
                          <p className="text-gray-500 capitalize">Payment: {paymentMethod}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Invoice</p>
                          <p className="font-bold text-gray-900">{format(new Date(), "dd MMM yyyy")}</p>
                          <p className="text-gray-500">Direct Billing</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Line Items */}
                  <table className="w-full text-sm mb-5">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="py-2 text-left text-xs font-bold uppercase text-gray-400 tracking-wide">Description</th>
                        <th className="py-2 text-right text-xs font-bold uppercase text-gray-400 tracking-wide">Qty</th>
                        <th className="py-2 text-right text-xs font-bold uppercase text-gray-400 tracking-wide">Rate</th>
                        <th className="py-2 text-right text-xs font-bold uppercase text-gray-400 tracking-wide">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeRoomId && currentRoomCharges && (
                        <>
                          <tr className="border-b border-gray-50">
                            <td className="py-3 font-medium">Room Tariff ({currentRoomCharges.room.category})</td>
                            <td className="py-3 text-right text-gray-500 tabular-nums">{currentRoomCharges.nights}N</td>
                            <td className="py-3 text-right text-gray-500 tabular-nums">₹{currentRoomCharges.booking.tariff.toLocaleString("en-IN")}</td>
                            <td className="py-3 text-right font-bold tabular-nums">₹{currentRoomCharges.roomTotal.toLocaleString("en-IN")}</td>
                          </tr>
                          {currentRoomCharges.restaurantTotal > 0 && (
                            <tr className="border-b border-gray-50">
                              <td className="py-3 font-medium">Restaurant Charges</td>
                              <td className="py-3 text-right text-gray-500">—</td>
                              <td className="py-3 text-right text-gray-500">—</td>
                              <td className="py-3 text-right font-bold tabular-nums">₹{currentRoomCharges.restaurantTotal.toLocaleString("en-IN")}</td>
                            </tr>
                          )}
                          {currentRoomCharges.cafeTotal > 0 && (
                            <tr className="border-b border-gray-50">
                              <td className="py-3 font-medium">Café Charges</td>
                              <td className="py-3 text-right text-gray-500">—</td>
                              <td className="py-3 text-right text-gray-500">—</td>
                              <td className="py-3 text-right font-bold tabular-nums">₹{currentRoomCharges.cafeTotal.toLocaleString("en-IN")}</td>
                            </tr>
                          )}
                        </>
                      )}
                      
                      {activeTableKey && currentTableCharges && currentTableCharges.orders.map((order, idx) => (
                        <tr key={order._id} className="border-b border-gray-50">
                          <td className="py-3 font-medium">Order KOT #{order._id.slice(-4).toUpperCase()}</td>
                          <td className="py-3 text-right text-gray-500 tabular-nums">{order.items.length} items</td>
                          <td className="py-3 text-right text-gray-500">—</td>
                          <td className="py-3 text-right font-bold tabular-nums">₹{order.totalAmount.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="space-y-2 text-sm border-t border-gray-100 pt-4">
                    {activeRoomId && currentRoomCharges && currentRoomCharges.booking.advance > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Advance Paid</span>
                        <span className="tabular-nums font-medium">−₹{currentRoomCharges.booking.advance.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span className="tabular-nums font-medium">−₹{discountAmount.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {serviceCharge > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Service Charge</span>
                        <span className="tabular-nums font-medium">₹{serviceCharge.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {housekeepingCharge > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Housekeeping</span>
                        <span className="tabular-nums font-medium">₹{housekeepingCharge.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {extraCharge > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Extra Charges</span>
                        <span className="tabular-nums font-medium">₹{extraCharge.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600 font-bold border-t border-gray-100 pt-2 mt-2">
                      <span>Subtotal</span>
                      <span className="tabular-nums font-medium">
                        ₹{(activeRoomId ? currentRoomCharges?.subtotal : tableSubtotal)?.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <AnimatePresence>
                      {includeGST && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2">
                          <div className="flex justify-between text-gray-500">
                            <span>CGST (6%)</span>
                            <span className="tabular-nums">₹{(activeRoomId ? currentRoomCharges?.cgst : tableCgst)?.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>SGST (6%)</span>
                            <span className="tabular-nums">₹{(activeRoomId ? currentRoomCharges?.sgst : tableSgst)?.toLocaleString("en-IN")}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                      <span>Total Payable</span>
                      <span className="tabular-nums text-indigo-700">
                        ₹{(activeRoomId ? 
                          Math.max(0, (currentRoomCharges?.grandTotal || 0) - (currentRoomCharges?.booking.advance || 0)) : 
                          tableGrandTotal
                        )?.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <p className="text-center text-xs text-gray-400 italic mt-6 pt-4 border-t border-gray-100">
                    Thank you for visiting Shyam Hotel. We hope to see you again!
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
