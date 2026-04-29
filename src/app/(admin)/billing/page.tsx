"use client";

import { useState, useEffect, Fragment } from "react";
import { format, differenceInDays, parseISO } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  Printer,
  CreditCard,
  Banknote,
  Smartphone,
  BedDouble,
  IndianRupee,
  User,
  Thermometer,
  FileText,
} from "lucide-react";
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
const THERMAL_PRINT_STYLES = `
@media print {
  /* Hide the entire page body */
  body > * { display: none !important; }

  /* Pull thermal receipt into view and show it */
  #thermal-receipt {
    display: block !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 80mm !important;
    font-family: 'Courier New', Courier, monospace !important;
    font-size: 11px !important;
    line-height: 1.5 !important;
    color: #000 !important;
    background: #fff !important;
    padding: 5mm 4mm !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }

  #thermal-receipt * {
    color: #000 !important;
    background: transparent !important;
    box-shadow: none !important;
    text-shadow: none !important;
  }

  #thermal-receipt .thermal-solid-divider {
    border: none !important;
    border-top: 1px solid #000 !important;
    margin: 5px 0 !important;
    display: block !important;
  }

  #thermal-receipt .thermal-dashed-divider {
    border: none !important;
    border-top: 1px dashed #000 !important;
    margin: 4px 0 !important;
    display: block !important;
  }

  #thermal-receipt table {
    width: 100% !important;
    border-collapse: collapse !important;
    font-size: 10px !important;
  }
  #thermal-receipt th,
  #thermal-receipt td {
    padding: 1px 2px !important;
  }

  #thermal-receipt .thermal-total-row {
    font-size: 14px !important;
    font-weight: bold !important;
    padding-top: 4px !important;
  }

  #thermal-receipt .thermal-center { text-align: center !important; }
  #thermal-receipt .thermal-right  { text-align: right  !important; }

  @page { size: 80mm auto; margin: 0; }
}
`;

// ─── Normal (A4) Print Styles ────────────────────────────────────────────────
const NORMAL_PRINT_STYLES = `
@media print {
  /* Hide the entire page body */
  body > * { display: none !important; }

  /* Pull A4 invoice into view and show it */
  #normal-receipt {
    display: block !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 210mm !important;
    min-height: 297mm !important;
    font-family: 'Georgia', 'Times New Roman', serif !important;
    color: #000 !important;
    background: #fff !important;
    padding: 0 !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }

  #normal-receipt * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  #normal-receipt img {
    display: block !important;
  }

  @page { size: A4; margin: 0; }
}
`;

type PrintMode = "thermal" | "normal";

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<"rooms" | "tables">("rooms");
  const [printMode, setPrintMode] = useState<PrintMode>("normal");
  const settings = useQuery(api.settings.getHotelSettings);

  const roomGstRate = (settings?.roomGst || 12) / 100;
  const foodGstRate = (settings?.foodGst || 5) / 100;

  // no style injection needed — we use window.open() to print

  useEffect(() => {
    if (
      settings?.defaultBillingTab === "tables" ||
      settings?.defaultBillingTab === "rooms"
    ) {
      setActiveTab(settings.defaultBillingTab);
    }
  }, [settings?.defaultBillingTab]);

  const [activeRoomId, setActiveRoomId] = useState<Id<"rooms"> | null>(null);
  const [activeTableKey, setActiveTableKey] = useState<string | null>(null);
  const [includeGST, setIncludeGST] = useState(false);
  const [includeFoodGST, setIncludeFoodGST] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [guestGst, setGuestGst] = useState(""); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [serviceCharge, setServiceCharge] = useState<number>(0);
  const [housekeepingCharge, setHousekeepingCharge] = useState<number>(0);
  const [extraCharge, setExtraCharge] = useState<number>(0);
  const [useSplitPayment, setUseSplitPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState<
    { method: string; amount: number }[]
  >([
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

  const occupiedRooms = rooms.filter(
    (r) => r.status === "occupied" || r.status === "pending_checkout"
  );

  const activeTablesMap = tableOrders.reduce(
    (acc, order) => {
      const key = `${order.outlet}:${order.tableNumber}`;
      if (!acc[key])
        acc[key] = {
          outlet: order.outlet,
          tableNumber: order.tableNumber,
          total: 0,
          count: 0,
          orders: [],
        };
      acc[key].total += order.totalAmount;
      acc[key].count += 1;
      acc[key].orders.push(order);
      return acc;
    },
    {} as Record<
      string,
      {
        outlet: string;
        tableNumber: string;
        total: number;
        count: number;
        orders: any[];
      }
    >
  );

  const activeTablesList = Object.values(activeTablesMap);

  const getActiveBooking = (roomId: Id<"rooms">) =>
    bookings.find(
      (b) =>
        b.roomId === roomId &&
        (b.status === "checked_in" || b.status === "confirmed")
    );

  const getCharges = (roomId: Id<"rooms">) => {
    const r = rooms.find((rm) => rm._id === roomId);
    const b = getActiveBooking(roomId);
    if (!r || !b) return null;

    let nights = differenceInDays(new Date(), parseISO(b.checkIn));
    if (nights === 0) nights = 1;

    const roomBaseTotal = b.tariff * nights;
    const extraBedTotal = b.extraBed ? 500 * nights : 0;

    let roomSubtotal =
      roomBaseTotal +
      extraBedTotal +
      serviceCharge +
      housekeepingCharge +
      extraCharge;
    roomSubtotal = Math.max(0, roomSubtotal - discountAmount);

    const roomCgst = includeGST
      ? Math.round(roomSubtotal * (roomGstRate / 2))
      : 0;
    const roomSgst = includeGST
      ? Math.round(roomSubtotal * (roomGstRate / 2))
      : 0;

    const linkedOrders = orders.filter(
      (o) => o.roomId === roomId && o.status !== "paid"
    );
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
        splitPayments: useSplitPayment
          ? splitPayments.filter((s) => s.amount > 0)
          : undefined,
        gstin: guestGst || undefined,
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
        splitPayments: useSplitPayment
          ? splitPayments.filter((s) => s.amount > 0)
          : undefined,
        gstin: guestGst || undefined,
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
  const currentTableCharges = activeTableKey
    ? activeTablesMap[activeTableKey]
    : null;

  const tableBaseTotal = currentTableCharges?.total || 0;
  const tableSubtotal = Math.max(
    0,
    tableBaseTotal +
      serviceCharge +
      housekeepingCharge +
      extraCharge -
      discountAmount
  );
  const tableCgst =
    includeGST && includeFoodGST
      ? Math.round(tableSubtotal * (foodGstRate / 2))
      : 0;
  const tableSgst =
    includeGST && includeFoodGST
      ? Math.round(tableSubtotal * (foodGstRate / 2))
      : 0;
  const tableGrandTotal = tableSubtotal + tableCgst + tableSgst;

  const currentGrandTotal = activeRoomId
    ? currentRoomCharges?.grandTotal || 0
    : tableGrandTotal;
  const splitTotal = splitPayments.reduce((acc, curr) => acc + curr.amount, 0);
  const isSplitValid = Math.abs(currentGrandTotal - splitTotal) < 1;
  const buttonDisabled = isSubmitting || (useSplitPayment && !isSplitValid);

  const invoiceNumber = `SP-${format(new Date(), "yyyyMMdd-HHmm")}`;

  const outletName = (outlet?: string) => {
    if (!outlet) return "";
    if (outlet === "restaurant") return "Restaurant";
    if (outlet === "cafe") return "Café";
    return outlet
      .replace(/shyam-/i, "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Shared props for both receipt components
  const receiptProps = {
    settings,
    invoiceNumber,
    activeRoomId,
    currentRoomCharges,
    currentTableCharges,
    paymentMethod: useSplitPayment ? "split" : paymentMethod,
    splitPayments: useSplitPayment ? splitPayments : undefined,
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
    guestGst,
  };

  // ── Print handler — uses IPC in Electron, iframe fallback in browser ─────────
  const handlePrint = async () => {
    const { printReceipt } = await import("@/lib/print");
    const targetId = printMode === "thermal" ? "thermal-receipt" : "normal-receipt";
    const el = document.getElementById(targetId);
    if (!el) return;
    await printReceipt(el.innerHTML, printMode === "thermal");
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
                  <h1 className="text-xl font-bold text-gray-900">
                    Billing & Checkout
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Select a service to generate final bill
                  </p>
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
                      <p className="font-semibold text-gray-900">
                        No rooms currently occupied
                      </p>
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
                            isPending
                              ? "border-amber-300"
                              : "border-gray-100"
                          )}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                                <BedDouble
                                  size={18}
                                  className="text-gray-500"
                                />
                              </div>
                              <div>
                                <p className="text-base font-bold text-gray-900 tabular-nums">
                                  #{room.roomNumber}
                                </p>
                                <p className="text-xs text-gray-400 capitalize">
                                  {room.category}
                                </p>
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
                            <p className="text-sm font-semibold text-gray-800">
                              {b.guestName}
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                              {b.checkIn}
                            </p>
                            <p className="text-sm font-bold text-gray-900 tabular-nums flex items-center gap-0.5">
                              <IndianRupee size={12} />
                              {b.tariff.toLocaleString("en-IN")}
                              <span className="text-xs font-normal text-gray-400">
                                /nt
                              </span>
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
                    <p className="font-semibold text-gray-900">
                      No active tables
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      All tables are currently clear or paid.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeTablesList.map((table) => (
                    <button
                      key={`${table.outlet}:${table.tableNumber}`}
                      onClick={() =>
                        setActiveTableKey(
                          `${table.outlet}:${table.tableNumber}`
                        )
                      }
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm text-left p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                            <span className="font-black text-indigo-600">
                              T
                            </span>
                          </div>
                          <div>
                            <p className="text-base font-bold text-gray-900 tabular-nums">
                              Table {table.tableNumber}
                            </p>
                            <p className="text-xs text-gray-400 font-medium">
                              {outletName(table.outlet)}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase">
                          {table.count} KOTs
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                        <p className="text-xs text-gray-400 font-medium">
                          Pending Dues
                        </p>
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
                {/* ── Controls ── */}
                <div className="lg:col-span-2 space-y-4 print:hidden">

                  {/* ── Print Mode Toggle ── */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex gap-2">
                    <button
                      onClick={() => setPrintMode("thermal")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold transition-all",
                        printMode === "thermal"
                          ? "bg-gray-900 text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      <Thermometer size={15} />
                      Thermal (80mm)
                    </button>
                    <button
                      onClick={() => setPrintMode("normal")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold transition-all",
                        printMode === "normal"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      <FileText size={15} />
                      Invoice (A4)
                    </button>
                  </div>

                  {/* GST Toggles */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          Include Room GST
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Room tax @ {roomGstRate * 100}%
                        </p>
                      </div>
                      <Switch
                        checked={includeGST}
                        onCheckedChange={setIncludeGST}
                      />
                    </div>
                    <div className="h-px bg-gray-50" />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          Include Food GST
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          F&B tax @ {foodGstRate * 100}%
                        </p>
                      </div>
                      <Switch
                        checked={includeFoodGST}
                        onCheckedChange={setIncludeFoodGST}
                      />
                    </div>
                  </div>

                  {/* Modifiers */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                    {/* --- ADD THIS NEW GUEST GSTIN FIELD --- */}
                    <div className="mb-2 border-b border-gray-100 pb-4">
                      <Label className="text-sm font-bold text-indigo-900 block mb-2">
                        Guest GSTIN <span className="font-normal text-gray-500">(For Corporate Bills)</span>
                      </Label>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                        value={guestGst}
                        onChange={(e) => setGuestGst(e.target.value.toUpperCase())}
                        placeholder="e.g. 09XXXXX1234X1ZX"
                        maxLength={15}
                      />
                    </div>
                    {/* -------------------------------------- */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-bold text-gray-900 block mb-2">
                          Discount (₹)
                        </Label>
                        <input
                          type="number"
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
                          value={discountAmount || ""}
                          onChange={(e) =>
                            setDiscountAmount(Number(e.target.value))
                          }
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-bold text-gray-900 block mb-2">
                          Service (₹)
                        </Label>
                        <input
                          type="number"
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
                          value={serviceCharge || ""}
                          onChange={(e) =>
                            setServiceCharge(Number(e.target.value))
                          }
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
                            onChange={(e) =>
                              setHousekeepingCharge(Number(e.target.value))
                            }
                            placeholder="0"
                          />
                        </div>
                      )}
                      <div className={cn(!activeRoomId && "col-span-2")}>
                        <Label className="text-sm font-bold text-gray-900 block mb-2">
                          Extra Charge (₹)
                        </Label>
                        <input
                          type="number"
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
                          value={extraCharge || ""}
                          onChange={(e) =>
                            setExtraCharge(Number(e.target.value))
                          }
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
                        <Switch
                          checked={useSplitPayment}
                          onCheckedChange={setUseSplitPayment}
                        />
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
                            <span className="text-xs font-bold">
                              {m.label}
                            </span>
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
                            setSplitPayments([
                              ...splitPayments,
                              { method: "cash", amount: 0 },
                            ])
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
                      onClick={handlePrint}
                    >
                      <Printer size={18} />
                      Print{" "}
                      {printMode === "thermal" ? "Thermal Receipt" : "A4 Invoice"}
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
                      onClick={
                        activeRoomId ? handleCheckout : handleBillTable
                      }
                    >
                      {isSubmitting
                        ? "Processing…"
                        : activeRoomId
                          ? "Confirm Check-out"
                          : "Confirm Payment"}
                    </Button>
                    {useSplitPayment && !isSplitValid && (
                      <p className="text-[10px] text-red-500 font-bold text-center mt-1 animate-pulse">
                        Split sum (₹{splitTotal}) must equal total (₹
                        {Math.round(currentGrandTotal)})
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Receipt Preview ── */}
                <div className="lg:col-span-3">
                  {/* Screen preview — only shows the active mode */}
                  {printMode === "thermal" ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 print:hidden">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                        Receipt Preview (80mm thermal)
                      </p>
                      <div
                        className="mx-auto border border-dashed border-gray-200 rounded p-3"
                        style={{ maxWidth: 320, fontFamily: "'Courier New', monospace", fontSize: 12, lineHeight: 1.5 }}
                      >
                        <ThermalReceiptContent {...receiptProps} />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-100 rounded-2xl border border-gray-200 p-4 print:hidden">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                        Invoice Preview (A4)
                      </p>
                      <div
                        className="mx-auto shadow-xl rounded overflow-hidden"
                        style={{ maxWidth: 540, transform: "scale(0.97)", transformOrigin: "top center" }}
                      >
                        <NormalInvoiceContent {...receiptProps} />
                      </div>
                    </div>
                  )}

                  {/*
                    PRINT TARGETS — both always in DOM so the CSS @media print rules
                    can find them. We use `visibility: hidden` on screen (not display:none)
                    so the browser print engine can still render them.
                    The injected print styles then flip visibility: visible on the active one.
                  */}
                  <div
                    id="thermal-receipt"
                    aria-hidden="true"
                    style={{ position: "fixed", top: 0, left: "-9999px", width: "80mm", pointerEvents: "none" }}
                  >
                    <ThermalReceiptContent {...receiptProps} />
                  </div>
                  <div
                    id="normal-receipt"
                    aria-hidden="true"
                    style={{ position: "fixed", top: 0, left: "-9999px", width: "210mm", pointerEvents: "none" }}
                  >
                    <NormalInvoiceContent {...receiptProps} />
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

// ─── ThermalReceiptContent — Luxury B&W Thermal ──────────────────────────────

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
  guestGst?: string;
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
  guestGst,
}: ThermalProps) {
  const now = new Date();

  const solidDivider = () => (
    <div className="thermal-solid-divider" style={{ borderTop: "1px solid #000", margin: "5px 0" }} />
  );
  const dashedDivider = () => (
    <div className="thermal-dashed-divider" style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />
  );

  const row = (label: string, value: string, bold = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: bold ? "bold" : "normal", fontSize: bold ? 12 : 10.5, marginBottom: 2 }}>
      <span style={{ color: "#000" }}>{label}</span>
      <span style={{ color: "#000", fontFamily: "'Courier New', monospace" }}>{value}</span>
    </div>
  );

  const tableRow = (desc: string, qty: string, rate: string, amt: string) => (
    <tr>
      <td style={{ paddingRight: 4, wordBreak: "break-word", fontSize: 10, paddingTop: 2, paddingBottom: 2 }}>{desc}</td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap", fontSize: 10 }}>{qty}</td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap", fontSize: 10 }}>{rate}</td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap", fontWeight: "bold", fontSize: 10 }}>{amt}</td>
    </tr>
  );

  const hotelName = settings?.hotelName || "Sarovar Palace";
  const address = settings?.address || "Lukerganj, Prayagraj";
  const phone = settings?.phone || "";
  const gstin = settings?.gstin || "09AABCU9603R1ZN";

  const grandTotalPayable = activeRoomId
    ? Math.max(0, (currentRoomCharges?.grandTotal ?? 0) - (currentRoomCharges?.booking?.advance ?? 0))
    : tableGrandTotal;

  return (
    <div style={{ color: "#000", background: "#fff", fontFamily: "'Courier New', Courier, monospace" }}>

      {/* Header */}
      <div className="thermal-center" style={{ textAlign: "center", marginBottom: 2 }}>
        {/* Decorative top rule */}
        <div style={{ borderTop: "2px solid #000", marginBottom: 6 }} />

        <div style={{ fontSize: 17, fontWeight: "bold", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {hotelName}
        </div>
        <div style={{ fontSize: 9, letterSpacing: "0.06em", marginTop: 2 }}>
          ─── ✦ ───
        </div>
        <div style={{ fontSize: 10, marginTop: 3, letterSpacing: "0.04em" }}>{address}</div>
        {phone && <div style={{ fontSize: 10 }}>Tel: {phone}</div>}
        {includeGST && <div style={{ fontSize: 9, marginTop: 2 }}>GSTIN: {gstin}</div>}

        <div style={{ borderTop: "2px solid #000", marginTop: 6 }} />
      </div>

      {/* Bill type label */}
      <div className="thermal-center" style={{ textAlign: "center", fontWeight: "bold", fontSize: 11, letterSpacing: "0.15em", marginTop: 5, marginBottom: 5 }}>
        {includeGST ? "★  TAX INVOICE  ★" : "★  RECEIPT  ★"}
      </div>

      {solidDivider()}

      {/* Bill meta */}
      {row("Bill No.", invoiceNumber)}
      {row("Date & Time", format(now, "dd/MM/yyyy  HH:mm"))}

      {dashedDivider()}

      {/* Guest / Table info */}
      {activeRoomId && currentRoomCharges ? (
        <>
          {row("Guest", currentRoomCharges.booking.guestName)}
          {row("Room", `#${currentRoomCharges.room.roomNumber} (${currentRoomCharges.room.category})`)}
          {row("Check-In", currentRoomCharges.booking.checkIn)}
          {row("Nights", String(currentRoomCharges.nights))}
        </>
      ) : (
        <>
          {row("Outlet", outletName(currentTableCharges?.outlet) || "—")}
          {row("Table No.", currentTableCharges?.tableNumber || "—")}
          {row("Type", "Walk-in")}
        </>
      )}
      {row("Payment", paymentMethod.toUpperCase())}

      {solidDivider()}

      {/* Items table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", paddingBottom: 3, fontWeight: "bold", fontSize: 10, borderBottom: "1px solid #000" }}>DESCRIPTION</th>
            <th style={{ textAlign: "right", paddingBottom: 3, fontWeight: "bold", fontSize: 10, borderBottom: "1px solid #000" }}>QTY</th>
            <th style={{ textAlign: "right", paddingBottom: 3, fontWeight: "bold", fontSize: 10, borderBottom: "1px solid #000" }}>RATE</th>
            <th style={{ textAlign: "right", paddingBottom: 3, fontWeight: "bold", fontSize: 10, borderBottom: "1px solid #000" }}>AMT</th>
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
                tableRow("Extra Bed", `${currentRoomCharges.nights}N`, "500", `${currentRoomCharges.extraBedTotal.toLocaleString("en-IN")}`)}
              {currentRoomCharges.linkedOrders.length > 0 && (
                <>
                  <tr>
                    <td colSpan={4} style={{ paddingTop: 5, paddingBottom: 2, fontWeight: "bold", fontSize: 9, borderTop: "1px dashed #000", letterSpacing: "0.06em" }}>
                      FOOD &amp; BEVERAGES
                    </td>
                  </tr>
                  {currentRoomCharges.linkedOrders.map((order: any) => (
                    <Fragment key={order._id}>
                      <tr>
                        <td colSpan={3} style={{ paddingTop: 3, paddingBottom: 1, fontSize: 9, fontWeight: "bold" }}>
                          KOT #{order.kotNumber || order._id.slice(-4).toUpperCase()} · {order.outlet.toUpperCase()} · {format(new Date(order.createdAt), "HH:mm")}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "bold", fontSize: 9 }}>
                          {order.subtotal.toLocaleString("en-IN")}
                        </td>
                      </tr>
                      {order.items.map((item: any, iidx: number) => (
                        <tr key={iidx}>
                          <td style={{ paddingLeft: 6, fontSize: 9 }}>{item.name}</td>
                          <td style={{ textAlign: "right", fontSize: 9 }}>{item.quantity}</td>
                          <td style={{ textAlign: "right", fontSize: 9 }}>{item.price}</td>
                          <td style={{ textAlign: "right", fontSize: 9 }}>{(item.quantity * item.price).toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </>
              )}
            </>
          ) : (
            currentTableCharges?.orders?.map((order: any) => (
              <Fragment key={order._id}>
                <tr>
                  <td colSpan={3} style={{ paddingTop: 3, paddingBottom: 1, fontSize: 9, fontWeight: "bold" }}>
                    KOT #{order.kotNumber || order._id.slice(-4).toUpperCase()} · {format(new Date(order.createdAt), "HH:mm")}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: "bold", fontSize: 9 }}>
                    {(order.subtotal || order.totalAmount || 0).toLocaleString("en-IN")}
                  </td>
                </tr>
                {order.items?.map((item: any, iidx: number) => (
                  <tr key={iidx}>
                    <td style={{ paddingLeft: 6, fontSize: 9 }}>{item.name}</td>
                    <td style={{ textAlign: "right", fontSize: 9 }}>{item.quantity}</td>
                    <td style={{ textAlign: "right", fontSize: 9 }}>{item.price}</td>
                    <td style={{ textAlign: "right", fontSize: 9 }}>{(item.quantity * item.price).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </Fragment>
            ))
          )}
        </tbody>
      </table>

      {solidDivider()}

      {/* Adjustments */}
      {activeRoomId && currentRoomCharges?.booking?.advance > 0 &&
        row("Advance Paid", `- Rs.${currentRoomCharges.booking.advance.toLocaleString("en-IN")}`)}
      {discountAmount > 0 && row("Discount", `- Rs.${discountAmount.toLocaleString("en-IN")}`)}
      {serviceCharge > 0 && row("Service Charge", `Rs.${serviceCharge.toLocaleString("en-IN")}`)}
      {housekeepingCharge > 0 && row("Housekeeping", `Rs.${housekeepingCharge.toLocaleString("en-IN")}`)}
      {extraCharge > 0 && row("Extra Charges", `Rs.${extraCharge.toLocaleString("en-IN")}`)}

      {row("Subtotal", `Rs.${(activeRoomId ? currentRoomCharges?.subtotal ?? 0 : tableSubtotal).toLocaleString("en-IN")}`)}

      {includeGST && (
        <>
          {row(`CGST @ ${(roomGstRate / 2) * 100}%`, `Rs.${(activeRoomId ? currentRoomCharges?.cgst ?? 0 : tableCgst).toLocaleString("en-IN")}`)}
          {row(`SGST @ ${(roomGstRate / 2) * 100}%`, `Rs.${(activeRoomId ? currentRoomCharges?.sgst ?? 0 : tableSgst).toLocaleString("en-IN")}`)}
        </>
      )}

      {solidDivider()}

      {/* Grand Total */}
      <div className="thermal-total-row" style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 14, marginBottom: 2, letterSpacing: "0.04em" }}>
        <span>TOTAL PAYABLE</span>
        <span>Rs.{grandTotalPayable.toLocaleString("en-IN")}</span>
      </div>

      {/* Split payments */}
      {splitPayments && splitPayments.filter((s) => s.amount > 0).length > 0 && (
        <>
          {dashedDivider()}
          {splitPayments.filter((s) => s.amount > 0).map((s, i) => (
            <Fragment key={i}>
              {row(`  ${s.method.toUpperCase()}`, `Rs.${s.amount.toLocaleString("en-IN")}`)}
            </Fragment>
          ))}
        </>
      )}

      {solidDivider()}

      {/* Footer */}
      <div className="thermal-center" style={{ textAlign: "center", fontSize: 10, marginTop: 6, lineHeight: 1.7 }}>
        <div style={{ fontWeight: "bold", letterSpacing: "0.06em" }}>Thank you for your visit</div>
        <div style={{ fontSize: 9 }}>We look forward to welcoming you again</div>
        {includeGST && <div style={{ marginTop: 3, fontSize: 9 }}>This is a computer generated invoice.</div>}
        <div style={{ marginTop: 6, fontSize: 9, letterSpacing: "0.18em" }}>— ✦ —</div>
        <div style={{ borderTop: "1px solid #000", marginTop: 6 }} />
      </div>
    </div>
  );
}

// ─── NormalInvoiceContent — Luxury B&W A4 Hotel Invoice ─────────────────────

function NormalInvoiceContent({
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
  guestGst,
}: ThermalProps) {
  const now = new Date();

  const hotelName = settings?.hotelName || "Sarovar Palace";
  const address = settings?.address || "Lukerganj, Prayagraj";
  const phone = settings?.phone || "";
  const email = settings?.email || "";
  const gstin = settings?.gstin || "09AABCU9603R1ZN";

  const grandTotalPayable = activeRoomId
    ? Math.max(0, (currentRoomCharges?.grandTotal ?? 0) - (currentRoomCharges?.booking?.advance ?? 0))
    : tableGrandTotal;

  const subtotalDisplay = activeRoomId ? currentRoomCharges?.subtotal ?? 0 : tableSubtotal;
  const cgstDisplay = activeRoomId ? currentRoomCharges?.cgst ?? 0 : tableCgst;
  const sgstDisplay = activeRoomId ? currentRoomCharges?.sgst ?? 0 : tableSgst;

  // Collect all line items
  const lineItems: { description: string; qty: string; rate: string; amount: number }[] = [];

  if (activeRoomId && currentRoomCharges) {
    lineItems.push({
      description: `Room Accommodation — ${currentRoomCharges.room.category}, Room #${currentRoomCharges.room.roomNumber}`,
      qty: `${currentRoomCharges.nights} night${currentRoomCharges.nights > 1 ? "s" : ""}`,
      rate: `₹${currentRoomCharges.booking.tariff.toLocaleString("en-IN")}`,
      amount: currentRoomCharges.roomBaseTotal,
    });
    if (currentRoomCharges.booking.extraBed) {
      lineItems.push({ description: "Extra Bed", qty: `${currentRoomCharges.nights} night${currentRoomCharges.nights > 1 ? "s" : ""}`, rate: "₹500", amount: currentRoomCharges.extraBedTotal });
    }
    currentRoomCharges.linkedOrders.forEach((order: any) => {
      order.items?.forEach((item: any) => {
        lineItems.push({ description: `${item.name} (${outletName(order.outlet)})`, qty: String(item.quantity), rate: `₹${item.price.toLocaleString("en-IN")}`, amount: item.quantity * item.price });
      });
    });
  } else if (currentTableCharges) {
    currentTableCharges.orders?.forEach((order: any) => {
      order.items?.forEach((item: any) => {
        lineItems.push({ description: `${item.name} (${outletName(order.outlet)})`, qty: String(item.quantity), rate: `₹${item.price.toLocaleString("en-IN")}`, amount: item.quantity * item.price });
      });
    });
  }

  if (serviceCharge > 0) lineItems.push({ description: "Service Charge", qty: "1", rate: `₹${serviceCharge.toLocaleString("en-IN")}`, amount: serviceCharge });
  if (housekeepingCharge > 0) lineItems.push({ description: "Housekeeping Charge", qty: "1", rate: `₹${housekeepingCharge.toLocaleString("en-IN")}`, amount: housekeepingCharge });
  if (extraCharge > 0) lineItems.push({ description: "Miscellaneous Charges", qty: "1", rate: `₹${extraCharge.toLocaleString("en-IN")}`, amount: extraCharge });

  // Shared font stack
  const serif = "'Georgia', 'Times New Roman', serif";
  const mono = "'Courier New', Courier, monospace";

  return (
    <div style={{ fontFamily: serif, background: "#fff", color: "#000", width: "100%", minHeight: "297mm", position: "relative" }}>

      {/* ── TOP BORDER ── */}
      <div style={{ height: 6, background: "#000", width: "100%" }} />
      <div style={{ height: 2, background: "#fff", width: "100%" }} />
      <div style={{ height: 1, background: "#000", width: "100%" }} />

      {/* ── HEADER ── */}
      <div style={{ padding: "28px 48px 22px", borderBottom: "1px solid #000" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>

          {/* Left: Logo + Hotel details */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
            {/* Logo */}
            <img
              src="/logo.png"
              alt={hotelName}
              style={{ height: 72, width: "auto", objectFit: "contain", display: "block", filter: "grayscale(100%) contrast(1.2)" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            {/* Vertical rule */}
            <div style={{ width: 1, height: 72, background: "#ccc", flexShrink: 0 }} />
            {/* Hotel info */}
            <div style={{ paddingTop: 4 }}>
              <div style={{ fontSize: 22, fontWeight: "bold", letterSpacing: "0.06em", color: "#000", lineHeight: 1.1, textTransform: "uppercase" }}>
                {hotelName}
              </div>
              <div style={{ width: 40, height: 1.5, background: "#000", margin: "7px 0" }} />
              <div style={{ fontSize: 10.5, color: "#444", letterSpacing: "0.04em", lineHeight: 1.7 }}>
                {address}
                {phone && <><br />Tel: {phone}</>}
                {email && <><br />{email}</>}
                {includeGST && <><br />GSTIN: {gstin}</>}
              </div>
            </div>
          </div>

          {/* Right: Invoice label */}
          <div style={{ textAlign: "right", paddingTop: 4 }}>
            <div style={{ fontSize: 9, fontWeight: "bold", letterSpacing: "0.22em", textTransform: "uppercase", color: "#666", marginBottom: 6 }}>
              {includeGST ? "Tax Invoice" : "Invoice"}
            </div>
            <div style={{ fontSize: 22, fontWeight: "bold", letterSpacing: "0.04em", fontFamily: mono, color: "#000", lineHeight: 1 }}>
              {invoiceNumber}
            </div>
            <div style={{ width: 40, height: 1.5, background: "#000", margin: "8px 0 8px auto" }} />
            <div style={{ fontSize: 10, color: "#444", lineHeight: 1.7 }}>
              <div>{format(now, "dd MMMM yyyy")}</div>
              <div style={{ fontFamily: mono }}>{format(now, "hh:mm a")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── GUEST + STAY DETAILS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", margin: "0", borderBottom: "1px solid #000" }}>

        {/* Billed To */}
        <div style={{ padding: "20px 28px 20px 48px", borderRight: "1px solid #ddd" }}>
          <div style={{ fontSize: 8.5, fontWeight: "bold", letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: 10 }}>
            Billed To
          </div>
          <div style={{ fontSize: 15, fontWeight: "bold", color: "#000", marginBottom: 4, letterSpacing: "0.02em" }}>
            {activeRoomId ? currentRoomCharges?.booking?.guestName || "Guest" : "Walk-in Guest"}
          </div>
          {guestGst && (
             <div style={{ fontSize: 12, color: "#000", fontWeight: "bold", marginBottom: 2 }}>
               GSTIN: {guestGst}
             </div>
          )}
          {activeRoomId && currentRoomCharges?.booking?.guestPhone && (
            <div style={{ fontSize: 11, color: "#555", marginBottom: 2 }}>{currentRoomCharges.booking.guestPhone}</div>
          )}
          {activeRoomId && currentRoomCharges?.booking?.idType && (
            <div style={{ fontSize: 10, color: "#777" }}>
              {currentRoomCharges.booking.idType}: {currentRoomCharges.booking.idNumber || "—"}
            </div>
          )}
          {!activeRoomId && currentTableCharges && (
            <div style={{ fontSize: 11, color: "#555" }}>
              {outletName(currentTableCharges.outlet)} · Table {currentTableCharges.tableNumber}
            </div>
          )}
          <div style={{ marginTop: 12, fontSize: 10, color: "#777", fontStyle: "italic" }}>
            Payment via: <strong style={{ color: "#000", fontStyle: "normal", textTransform: "capitalize" }}>
              {splitPayments && splitPayments.filter(s => s.amount > 0).length > 0 ? "Split Payment" : paymentMethod}
            </strong>
          </div>
        </div>

        {/* Stay / Service details */}
        <div style={{ padding: "20px 48px 20px 28px" }}>
          <div style={{ fontSize: 8.5, fontWeight: "bold", letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: 10 }}>
            {activeRoomId ? "Stay Details" : "Service Details"}
          </div>
          {activeRoomId && currentRoomCharges ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <tbody>
                {[
                  ["Room No.", `#${currentRoomCharges.room.roomNumber} · ${currentRoomCharges.room.category}`],
                  ["Check-In", currentRoomCharges.booking.checkIn],
                  ["Check-Out", currentRoomCharges.booking.checkOut || format(now, "dd/MM/yyyy")],
                  ["Duration", `${currentRoomCharges.nights} Night${currentRoomCharges.nights > 1 ? "s" : ""}`],
                  ["Tariff", `₹${currentRoomCharges.booking.tariff.toLocaleString("en-IN")} / night`],
                ].map(([label, val], i) => (
                  <tr key={i}>
                    <td style={{ paddingBottom: 5, color: "#666", width: "45%" }}>{label}</td>
                    <td style={{ paddingBottom: 5, fontWeight: "600", color: "#000", textAlign: "right" }}>{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <tbody>
                {[
                  ["Outlet", outletName(currentTableCharges?.outlet)],
                  ["Table No.", currentTableCharges?.tableNumber || "—"],
                  ["Orders", `${currentTableCharges?.count} KOT${(currentTableCharges?.count || 0) > 1 ? "s" : ""}`],
                  ["Date", format(now, "dd MMM yyyy, hh:mm a")],
                ].map(([label, val], i) => (
                  <tr key={i}>
                    <td style={{ paddingBottom: 5, color: "#666", width: "40%" }}>{label}</td>
                    <td style={{ paddingBottom: 5, fontWeight: "600", color: "#000", textAlign: "right" }}>{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── LINE ITEMS TABLE ── */}
      <div style={{ padding: "0 48px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 0 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #000" }}>
              {["Description", "Qty", "Rate", "Amount"].map((h, i) => (
                <th key={h} style={{
                  padding: "11px 0",
                  fontWeight: "bold",
                  fontSize: 9,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#000",
                  textAlign: i === 0 ? "left" : "right",
                  paddingLeft: i === 0 ? 0 : 12,
                  paddingRight: i === 3 ? 0 : 12,
                  whiteSpace: "nowrap",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #e8e8e8" }}>
                <td style={{ padding: "11px 12px 11px 0", color: "#000", fontWeight: i < 1 && activeRoomId ? "600" : "normal", lineHeight: 1.4, fontSize: 12 }}>
                  {item.description}
                </td>
                <td style={{ padding: "11px 12px", textAlign: "right", color: "#444", fontFamily: mono, fontSize: 11 }}>{item.qty}</td>
                <td style={{ padding: "11px 12px", textAlign: "right", color: "#444", fontFamily: mono, fontSize: 11 }}>{item.rate}</td>
                <td style={{ padding: "11px 0 11px 12px", textAlign: "right", fontWeight: "600", color: "#000", fontFamily: mono, fontSize: 12 }}>
                  ₹{item.amount.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── TOTALS + PAYMENT ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "2px solid #000", marginTop: 0 }}>

        {/* Left: Payment info + Thank you */}
        <div style={{ padding: "22px 28px 22px 48px", borderRight: "1px solid #ddd" }}>
          <div style={{ fontSize: 8.5, fontWeight: "bold", letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: 12 }}>
            Payment Information
          </div>

          {splitPayments && splitPayments.filter(s => s.amount > 0).length > 0 ? (
            <div style={{ marginBottom: 16 }}>
              {splitPayments.filter(s => s.amount > 0).map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: "#555", textTransform: "capitalize" }}>{s.method}</span>
                  <span style={{ fontWeight: "bold", fontFamily: mono }}>₹{s.amount.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 12 }}>
              <span style={{ color: "#555", textTransform: "capitalize" }}>{paymentMethod}</span>
              <span style={{ fontWeight: "bold", fontFamily: mono }}>₹{grandTotalPayable.toLocaleString("en-IN")}</span>
            </div>
          )}

          {activeRoomId && currentRoomCharges?.booking?.advance > 0 && (
            <div style={{ borderTop: "1px dashed #bbb", paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#777" }}>
              <span>Advance Paid</span>
              <span style={{ fontFamily: mono }}>₹{currentRoomCharges.booking.advance.toLocaleString("en-IN")}</span>
            </div>
          )}

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #e0e0e0" }}>
            <div style={{ fontSize: 12, color: "#444", fontStyle: "italic", lineHeight: 1.7 }}>
              Thank you for choosing <strong style={{ fontStyle: "normal", color: "#000" }}>{hotelName}</strong>.<br />
              We hope to welcome you again soon.
            </div>
            {includeGST && (
              <div style={{ marginTop: 8, fontSize: 9, color: "#999", letterSpacing: "0.04em" }}>
                This is a computer generated tax invoice.
              </div>
            )}
          </div>
        </div>

        {/* Right: Summary */}
        <div style={{ padding: "22px 48px 22px 28px" }}>
          <div style={{ fontSize: 8.5, fontWeight: "bold", letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: 12 }}>
            Summary
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <tbody>
              {discountAmount > 0 && (
                <tr>
                  <td style={{ paddingBottom: 8, color: "#555" }}>Discount</td>
                  <td style={{ paddingBottom: 8, textAlign: "right", fontFamily: mono, color: "#000" }}>- ₹{discountAmount.toLocaleString("en-IN")}</td>
                </tr>
              )}
              <tr>
                <td style={{ paddingBottom: 8, color: "#555" }}>Subtotal</td>
                <td style={{ paddingBottom: 8, textAlign: "right", fontFamily: mono, color: "#000" }}>₹{subtotalDisplay.toLocaleString("en-IN")}</td>
              </tr>
              {includeGST && (
                <>
                  <tr>
                    <td style={{ paddingBottom: 8, color: "#555" }}>CGST @ {(roomGstRate / 2) * 100}%</td>
                    <td style={{ paddingBottom: 8, textAlign: "right", fontFamily: mono, color: "#000" }}>₹{cgstDisplay.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr>
                    <td style={{ paddingBottom: 8, color: "#555" }}>SGST @ {(roomGstRate / 2) * 100}%</td>
                    <td style={{ paddingBottom: 8, textAlign: "right", fontFamily: mono, color: "#000" }}>₹{sgstDisplay.toLocaleString("en-IN")}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

          {/* Grand Total box */}
          <div style={{ borderTop: "2px solid #000", marginTop: 4, paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontWeight: "bold", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#000" }}>
              Total Payable
            </span>
            <span style={{ fontWeight: "bold", fontSize: 22, fontFamily: mono, color: "#000", letterSpacing: "0.02em" }}>
              ₹{grandTotalPayable.toLocaleString("en-IN")}
            </span>
          </div>
          <div style={{ borderTop: "4px double #000", marginTop: 6 }} />
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ borderTop: "1px solid #000", padding: "12px 48px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 9, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {hotelName} · {address}
        </div>
        <div style={{ fontSize: 9, color: "#888", fontFamily: mono }}>
          {invoiceNumber}
        </div>
      </div>

      {/* ── BOTTOM BORDER ── */}
      <div style={{ height: 1, background: "#000" }} />
      <div style={{ height: 2, background: "#fff" }} />
      <div style={{ height: 6, background: "#000" }} />

    </div>
  );
}