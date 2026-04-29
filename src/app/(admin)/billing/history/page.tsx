"use client";

import { useState, useEffect, Fragment, useMemo } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { DesktopTopbar } from "@/components/Topbar";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Search, Printer, Receipt, FileText, Thermometer, X } from "lucide-react";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

export default function InvoiceHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBillId, setSelectedBillId] = useState<Id<"bills"> | null>(null);
  const [printMode, setPrintMode] = useState<"thermal" | "normal">("normal");

  const bills = useQuery(api.billing.getAllBills) || [];
  
  // Memoize and sort bills
  const filteredBills = useMemo(() => {
    let result = [...bills];
    
    // Sort by _creationTime descending
    result.sort((a, b) => b._creationTime - a._creationTime);
    
    // Filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        b => 
          b.guestName?.toLowerCase().includes(lower) || 
          b.billType?.toLowerCase().includes(lower) ||
          b._id.toLowerCase().includes(lower) ||
          (b.paymentMethod && b.paymentMethod.toLowerCase().includes(lower))
      );
    }
    return result;
  }, [bills, searchTerm]);

  return (
    <div className="flex flex-col min-h-full">
      <DesktopTopbar title="Invoice History" />
      
      <div className="p-5 lg:p-6 max-w-7xl mx-auto w-full pb-24 lg:pb-6">
        
        {/* Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by guest name, bill type, ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Bill No</th>
                  <th className="px-6 py-4">Guest Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No bills found.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill) => (
                    <tr key={bill._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{format(new Date(bill._creationTime), "dd MMM yyyy")}</div>
                        <div className="text-xs text-gray-500">{format(new Date(bill._creationTime), "hh:mm a")}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-600">
                        {bill._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {bill.guestName}
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                          {bill.billType}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        ₹{bill.totalAmount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`capitalize text-xs font-bold px-2 py-1 rounded-md ${
                          bill.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                          onClick={() => setSelectedBillId(bill._id)}
                        >
                          <Printer size={14} className="mr-1.5" />
                          Print
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Print Modal */}
      <AnimatePresence>
        {selectedBillId && (
          <PrintModal 
            billId={selectedBillId} 
            onClose={() => setSelectedBillId(null)} 
            printMode={printMode}
            setPrintMode={setPrintMode}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Print Modal & Logic
// ─────────────────────────────────────────────────────────────────────────────

function PrintModal({ billId, onClose, printMode, setPrintMode }: { billId: Id<"bills">, onClose: () => void, printMode: "thermal" | "normal", setPrintMode: (m: "thermal"|"normal") => void }) {
  const details = useQuery(api.billing.getBillDetails, { billId });
  const settings = useQuery(api.settings.getHotelSettings);

  const handlePrint = async () => {
    const { printReceipt } = await import("@/lib/print");
    const targetId = printMode === "thermal" ? "history-thermal-receipt" : "history-normal-receipt";
    const el = document.getElementById(targetId);
    if (!el) return;
    await printReceipt(el.innerHTML, printMode === "thermal");
  };


  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Print Bill</h2>
              <p className="text-sm text-gray-500">Bill ID: {billId.slice(-6).toUpperCase()}</p>
            </div>
            <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-gray-50 flex flex-col lg:flex-row gap-6 items-start justify-center">
            
            {/* Controls */}
            <div className="w-full lg:w-64 shrink-0 space-y-4">
              <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2">
                <button
                  onClick={() => setPrintMode("thermal")}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all ${
                    printMode === "thermal" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <Thermometer size={16} /> Thermal (80mm)
                </button>
                <button
                  onClick={() => setPrintMode("normal")}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all ${
                    printMode === "normal" ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <FileText size={16} /> A4 Invoice
                </button>
              </div>

              <Button
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold gap-2"
                onClick={handlePrint}
                disabled={!details || !settings}
              >
                <Printer size={18} /> Print Now
              </Button>
            </div>

            {/* Preview */}
            <div className="flex-1 w-full flex justify-center">
              {!details || !settings ? (
                <div className="animate-pulse flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  <p className="text-gray-500 font-medium">Loading details...</p>
                </div>
              ) : (
                <div className="w-full max-w-lg bg-white shadow-md border border-gray-200 p-4 rounded-xl">
                  {printMode === "thermal" ? (
                    <div
                      className="mx-auto border border-dashed border-gray-200 rounded p-3 bg-white"
                      style={{ maxWidth: 320, fontFamily: "'Courier New', monospace", fontSize: 12, lineHeight: 1.5 }}
                    >
                      <ThermalReceiptContent details={details} settings={settings} />
                    </div>
                  ) : (
                    <div
                      className="mx-auto bg-white rounded overflow-hidden"
                      style={{ maxWidth: 540, transform: "scale(0.85)", transformOrigin: "top center" }}
                    >
                      <NormalInvoiceContent details={details} settings={settings} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Hidden Print Targets */}
      {details && settings && (
        <div style={{ display: 'none' }}>
          <div id="history-thermal-receipt">
            <ThermalReceiptContent details={details} settings={settings} />
          </div>
          <div id="history-normal-receipt">
            <NormalInvoiceContent details={details} settings={settings} />
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Receipt Components
// ─────────────────────────────────────────────────────────────────────────────

const GOOGLE_REVIEW_URL = "https://g.page/r/CRoioQu179CPEBM/review";

function ThermalReceiptContent({ details, settings }: any) {
  const { bill, roomCharges, tableCharges } = details;
  const now = new Date(bill._creationTime);

  const solidDivider = () => <div className="thermal-solid-divider" style={{ borderTop: "1px solid #000", margin: "5px 0" }} />;
  const dashedDivider = () => <div className="thermal-dashed-divider" style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />;

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

  const hotelName = settings?.hotelName || "Hotel Name";
  const address = settings?.address || "Address";
  const phone = settings?.phone || "";
  const gstin = settings?.gstin || "";

  const outletName = (outlet: string) => outlet.replace(/shyam-/i, "").replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div style={{ color: "#000", background: "#fff", fontFamily: "'Courier New', Courier, monospace" }}>
      <div className="thermal-center" style={{ textAlign: "center", marginBottom: 2 }}>
        <div style={{ borderTop: "2px solid #000", marginBottom: 6 }} />
        <div style={{ fontSize: 17, fontWeight: "bold", letterSpacing: "0.12em", textTransform: "uppercase" }}>{hotelName}</div>
        <div style={{ fontSize: 9, letterSpacing: "0.06em", marginTop: 2 }}>─── ✦ ───</div>
        <div style={{ fontSize: 10, marginTop: 3, letterSpacing: "0.04em" }}>{address}</div>
        {phone && <div style={{ fontSize: 10 }}>Tel: {phone}</div>}
        {bill.isGstBill && gstin && <div style={{ fontSize: 9, marginTop: 2 }}>GSTIN: {gstin}</div>}
        <div style={{ borderTop: "2px solid #000", marginTop: 6 }} />
      </div>

      <div className="thermal-center" style={{ textAlign: "center", fontWeight: "bold", fontSize: 11, letterSpacing: "0.15em", marginTop: 5, marginBottom: 5 }}>
        {bill.status === "paid" ? "★ RECEIPT ★" : "★ INVOICE ★"}
        <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>(REPRINT)</div>
      </div>

      {solidDivider()}

      {row("Bill No.", `SP-${format(now, "yyyyMMdd")}-${bill._id.slice(-4).toUpperCase()}`)}
      {row("Date & Time", format(now, "dd/MM/yyyy  HH:mm"))}

      {dashedDivider()}

      {bill.billType === "room" && roomCharges ? (
        <>
          {row("Guest", bill.guestName)}
          {roomCharges.room && row("Room", `#${roomCharges.room.roomNumber} (${roomCharges.room.category})`)}
          {roomCharges.booking && row("Check-In", roomCharges.booking.checkIn)}
          {row("Nights", String(roomCharges.nights || 1))}
        </>
      ) : tableCharges ? (
        <>
          {row("Guest", bill.guestName || "Walk-in")}
          {row("Outlet", outletName(tableCharges.outlet))}
          {row("Table No.", tableCharges.tableNumber)}
        </>
      ) : (
        row("Guest", bill.guestName)
      )}
      {row("Payment", (bill.paymentMethod || "UNKNOWN").toUpperCase())}

      {solidDivider()}

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
          {bill.billType === "room" && roomCharges ? (
            <>
              {tableRow(`Room Tariff`, `${roomCharges.nights}N`, `${roomCharges.booking?.tariff || 0}`, `${(roomCharges.roomBaseTotal || 0).toLocaleString("en-IN")}`)}
              {roomCharges.extraBedTotal > 0 && tableRow("Extra Bed", `${roomCharges.nights}N`, "500", `${roomCharges.extraBedTotal.toLocaleString("en-IN")}`)}
              {roomCharges.linkedOrders?.length > 0 && (
                <>
                  <tr>
                    <td colSpan={4} style={{ paddingTop: 5, paddingBottom: 2, fontWeight: "bold", fontSize: 9, borderTop: "1px dashed #000", letterSpacing: "0.06em" }}>FOOD &amp; BEVERAGES</td>
                  </tr>
                  {roomCharges.linkedOrders.map((order: any) => (
                    <Fragment key={order._id}>
                      {order.items?.map((item: any, idx: number) => (
                        <tr key={idx}>
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
          ) : tableCharges?.orders ? (
            tableCharges.orders.map((order: any) => (
               <Fragment key={order._id}>
                 {order.items?.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ paddingLeft: 6, fontSize: 9 }}>{item.name}</td>
                      <td style={{ textAlign: "right", fontSize: 9 }}>{item.quantity}</td>
                      <td style={{ textAlign: "right", fontSize: 9 }}>{item.price}</td>
                      <td style={{ textAlign: "right", fontSize: 9 }}>{(item.quantity * item.price).toLocaleString("en-IN")}</td>
                    </tr>
                 ))}
               </Fragment>
            ))
          ) : (
            tableRow(bill.billType.toUpperCase() + " CHARGES", "1", bill.subtotal.toString(), bill.subtotal.toLocaleString("en-IN"))
          )}
        </tbody>
      </table>

      {solidDivider()}

      {bill.advancePaid > 0 && row("Advance Paid", `- Rs.${bill.advancePaid.toLocaleString("en-IN")}`)}
      {bill.discountAmount > 0 && row("Discount", `- Rs.${bill.discountAmount.toLocaleString("en-IN")}`)}
      {bill.serviceCharge > 0 && row("Service Charge", `Rs.${bill.serviceCharge.toLocaleString("en-IN")}`)}
      {bill.housekeepingCharge > 0 && row("Housekeeping", `Rs.${bill.housekeepingCharge.toLocaleString("en-IN")}`)}
      {bill.extraCharge > 0 && row("Extra Charges", `Rs.${bill.extraCharge.toLocaleString("en-IN")}`)}

      {row("Subtotal", `Rs.${(bill.subtotal || 0).toLocaleString("en-IN")}`)}
      
      {bill.isGstBill && (
        <>
          {row(`CGST`, `Rs.${(bill.cgst || 0).toLocaleString("en-IN")}`)}
          {row(`SGST`, `Rs.${(bill.sgst || 0).toLocaleString("en-IN")}`)}
        </>
      )}

      {solidDivider()}

      <div className="thermal-total-row" style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 14, marginBottom: 2, letterSpacing: "0.04em" }}>
        <span>TOTAL</span>
        <span>Rs.{bill.totalAmount.toLocaleString("en-IN")}</span>
      </div>

      {bill.splitPayments?.length > 0 && (
        <>
          {dashedDivider()}
          {bill.splitPayments.filter((s:any) => s.amount > 0).map((s:any, i:number) => (
            <Fragment key={i}>
              {row(`  ${s.method.toUpperCase()}`, `Rs.${s.amount.toLocaleString("en-IN")}`)}
            </Fragment>
          ))}
        </>
      )}

      {solidDivider()}

      <div className="thermal-center" style={{ textAlign: "center", fontSize: 10, marginTop: 6, lineHeight: 1.7 }}>
        <div style={{ fontWeight: "bold", letterSpacing: "0.06em" }}>Thank you for your visit</div>
        {bill.isGstBill && <div style={{ marginTop: 3, fontSize: 9 }}>This is a computer generated invoice.</div>}
        <div style={{ marginTop: 6, fontSize: 9, letterSpacing: "0.18em" }}>— ✦ —</div>
        {/* Google Review QR */}
        <div style={{ marginTop: 8, borderTop: "1px dashed #000", paddingTop: 8 }}>
          <div style={{ fontSize: 8, letterSpacing: "0.1em", marginBottom: 4 }}>ENJOYED YOUR STAY? LEAVE US A REVIEW</div>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(GOOGLE_REVIEW_URL)}&qzone=1&format=png`}
            alt="Google Review QR"
            style={{ width: 70, height: 70, display: "block", margin: "0 auto" }}
          />
          <div style={{ fontSize: 7, marginTop: 3, color: "#555" }}>Scan to rate us on Google</div>
        </div>
        <div style={{ borderTop: "1px solid #000", marginTop: 6 }} />
      </div>
    </div>
  );
}

function NormalInvoiceContent({ details, settings }: any) {
  const { bill, roomCharges, tableCharges } = details;
  const now = new Date(bill._creationTime);

  const hotelName = settings?.hotelName || "Hotel Name";
  const address = settings?.address || "Address";
  const phone = settings?.phone || "";
  const email = settings?.email || "";
  const gstin = settings?.gstin || "";

  const outletName = (outlet: string) => outlet.replace(/shyam-/i, "").replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  const lineItems: { description: string; qty: string; rate: string; amount: number }[] = [];

  if (bill.billType === "room" && roomCharges) {
    lineItems.push({
      description: `Room Accommodation — ${roomCharges.room?.category || "Room"}, Room #${roomCharges.room?.roomNumber || "Unknown"}`,
      qty: `${roomCharges.nights || 1} night(s)`,
      rate: `₹${(roomCharges.booking?.tariff || 0).toLocaleString("en-IN")}`,
      amount: roomCharges.roomBaseTotal || 0,
    });
    if (roomCharges.extraBedTotal > 0) {
      lineItems.push({ description: "Extra Bed", qty: `${roomCharges.nights || 1} night(s)`, rate: "₹500", amount: roomCharges.extraBedTotal });
    }
    roomCharges.linkedOrders?.forEach((order: any) => {
      order.items?.forEach((item: any) => {
        lineItems.push({ description: `${item.name} (${outletName(order.outlet)})`, qty: String(item.quantity), rate: `₹${item.price.toLocaleString("en-IN")}`, amount: item.quantity * item.price });
      });
    });
  } else if (tableCharges?.orders) {
    tableCharges.orders.forEach((order: any) => {
      order.items?.forEach((item: any) => {
        lineItems.push({ description: `${item.name} (${outletName(order.outlet)})`, qty: String(item.quantity), rate: `₹${item.price.toLocaleString("en-IN")}`, amount: item.quantity * item.price });
      });
    });
  } else {
    lineItems.push({ description: `${bill.billType.toUpperCase()} CHARGES`, qty: "1", rate: `₹${bill.subtotal.toLocaleString("en-IN")}`, amount: bill.subtotal });
  }

  if (bill.serviceCharge > 0) lineItems.push({ description: "Service Charge", qty: "1", rate: `₹${bill.serviceCharge.toLocaleString("en-IN")}`, amount: bill.serviceCharge });
  if (bill.housekeepingCharge > 0) lineItems.push({ description: "Housekeeping Charge", qty: "1", rate: `₹${bill.housekeepingCharge.toLocaleString("en-IN")}`, amount: bill.housekeepingCharge });
  if (bill.extraCharge > 0) lineItems.push({ description: "Miscellaneous Charges", qty: "1", rate: `₹${bill.extraCharge.toLocaleString("en-IN")}`, amount: bill.extraCharge });

  const serif = "'Georgia', 'Times New Roman', serif";
  const mono = "'Courier New', Courier, monospace";

  return (
    <div style={{ fontFamily: serif, background: "#fff", color: "#000", width: "100%", minHeight: "297mm", position: "relative" }}>
      <div style={{ height: 6, background: "#000", width: "100%" }} />
      <div style={{ height: 2, background: "#fff", width: "100%" }} />
      <div style={{ height: 1, background: "#000", width: "100%" }} />

      <div style={{ padding: "28px 48px 22px", borderBottom: "1px solid #000" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
            <img src="/logo.png" alt={hotelName} style={{ height: 72, width: "auto", objectFit: "contain", filter: "grayscale(100%) contrast(1.2)" }} />
            <div style={{ width: 1, height: 72, background: "#ccc", flexShrink: 0 }} />
            <div style={{ paddingTop: 4 }}>
              <div style={{ fontSize: 22, fontWeight: "bold", letterSpacing: "0.06em", color: "#000", lineHeight: 1.1, textTransform: "uppercase" }}>{hotelName}</div>
              <div style={{ width: 40, height: 1.5, background: "#000", margin: "7px 0" }} />
              <div style={{ fontSize: 10.5, color: "#444", letterSpacing: "0.04em", lineHeight: 1.7 }}>
                {address}
                {phone && <><br />Tel: {phone}</>}
                {email && <><br />{email}</>}
                {bill.isGstBill && gstin && <><br />GSTIN: {gstin}</>}
              </div>
            </div>
          </div>

          <div style={{ textAlign: "right", paddingTop: 4 }}>
            <div style={{ fontSize: 9, fontWeight: "bold", letterSpacing: "0.22em", textTransform: "uppercase", color: "#666", marginBottom: 6 }}>
              {bill.isGstBill ? "Tax Invoice" : "Invoice"} <span style={{ color: "#999" }}>(Reprint)</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: "bold", letterSpacing: "0.04em", fontFamily: mono, color: "#000", lineHeight: 1 }}>
              SP-{format(now, "yyyyMMdd")}-{bill._id.slice(-4).toUpperCase()}
            </div>
            <div style={{ width: 40, height: 1.5, background: "#000", margin: "8px 0 8px auto" }} />
            <div style={{ fontSize: 10, color: "#444", lineHeight: 1.7 }}>
              <div>{format(now, "dd MMMM yyyy")}</div>
              <div style={{ fontFamily: mono }}>{format(now, "hh:mm a")}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", margin: "0", borderBottom: "1px solid #000" }}>
        <div style={{ padding: "20px 28px 20px 48px", borderRight: "1px solid #ddd" }}>
          <div style={{ fontSize: 8.5, fontWeight: "bold", letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: 10 }}>Billed To</div>
          <div style={{ fontSize: 15, fontWeight: "bold", color: "#000", marginBottom: 4, letterSpacing: "0.02em" }}>{bill.guestName || "Guest"}</div>
          {bill.gstin && <div style={{ fontSize: 12, color: "#000", fontWeight: "bold", marginBottom: 2 }}>GSTIN: {bill.gstin}</div>}
          <div style={{ marginTop: 12, fontSize: 10, color: "#777", fontStyle: "italic" }}>
            Payment via: <strong style={{ color: "#000", fontStyle: "normal", textTransform: "capitalize" }}>
              {bill.splitPayments?.length > 0 ? "Split Payment" : (bill.paymentMethod || "Cash")}
            </strong>
          </div>
        </div>

        <div style={{ padding: "20px 48px 20px 28px" }}>
          <div style={{ fontSize: 8.5, fontWeight: "bold", letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: 10 }}>
            {bill.billType === "room" ? "Stay Details" : "Service Details"}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <tbody>
              {bill.billType === "room" && roomCharges?.room ? [
                ["Room No.", `#${roomCharges.room.roomNumber} · ${roomCharges.room.category}`],
                ["Check-In", roomCharges.booking?.checkIn],
                ["Duration", `${roomCharges.nights} Night(s)`],
              ].map(([label, val], i) => (
                <tr key={i}>
                  <td style={{ paddingBottom: 5, color: "#666", width: "45%" }}>{label}</td>
                  <td style={{ paddingBottom: 5, fontWeight: "600", color: "#000", textAlign: "right" }}>{val}</td>
                </tr>
              )) : [
                ["Bill Type", bill.billType.toUpperCase()],
                ["Date", format(now, "dd MMM yyyy, hh:mm a")],
              ].map(([label, val], i) => (
                <tr key={i}>
                  <td style={{ paddingBottom: 5, color: "#666", width: "40%" }}>{label}</td>
                  <td style={{ paddingBottom: 5, fontWeight: "600", color: "#000", textAlign: "right" }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ padding: "0 48px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 0 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #000" }}>
              {["Description", "Qty", "Rate", "Amount"].map((h, i) => (
                <th key={h} style={{ padding: "11px 0", fontWeight: "bold", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#000", textAlign: i === 0 ? "left" : "right", paddingLeft: i === 0 ? 0 : 12, paddingRight: i === 3 ? 0 : 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #e8e8e8" }}>
                <td style={{ padding: "11px 12px 11px 0", color: "#000", fontWeight: i < 1 && bill.billType === "room" ? "600" : "normal", lineHeight: 1.4, fontSize: 12 }}>{item.description}</td>
                <td style={{ padding: "11px 12px", textAlign: "right", color: "#444", fontFamily: mono, fontSize: 11 }}>{item.qty}</td>
                <td style={{ padding: "11px 12px", textAlign: "right", color: "#444", fontFamily: mono, fontSize: 11 }}>{item.rate}</td>
                <td style={{ padding: "11px 0 11px 12px", textAlign: "right", fontWeight: "600", color: "#000", fontFamily: mono, fontSize: 12 }}>₹{item.amount.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "2px solid #000", marginTop: 0 }}>
        <div style={{ padding: "22px 28px 22px 48px", borderRight: "1px solid #ddd" }}>
          <div style={{ fontSize: 8.5, fontWeight: "bold", letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: 12 }}>Payment Information</div>
          {bill.splitPayments?.length > 0 ? (
            <div style={{ marginBottom: 16 }}>
              {bill.splitPayments.filter((s:any) => s.amount > 0).map((s:any, i:number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: "#555", textTransform: "capitalize" }}>{s.method}</span>
                  <span style={{ fontWeight: "bold", fontFamily: mono }}>₹{s.amount.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 12 }}>
              <span style={{ color: "#555", textTransform: "capitalize" }}>{bill.paymentMethod || "Cash"}</span>
              <span style={{ fontWeight: "bold", fontFamily: mono }}>₹{bill.totalAmount.toLocaleString("en-IN")}</span>
            </div>
          )}
          {bill.advancePaid > 0 && (
            <div style={{ borderTop: "1px dashed #bbb", paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#777" }}>
              <span>Advance Paid</span>
              <span style={{ fontFamily: mono }}>₹{bill.advancePaid.toLocaleString("en-IN")}</span>
            </div>
          )}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #e0e0e0" }}>
            <div style={{ fontSize: 12, color: "#444", fontStyle: "italic", lineHeight: 1.7 }}>
              Thank you for choosing <strong style={{ fontStyle: "normal", color: "#000" }}>{hotelName}</strong>.<br />
            </div>
            {bill.isGstBill && <div style={{ marginTop: 8, fontSize: 9, color: "#999", letterSpacing: "0.04em" }}>This is a computer generated tax invoice.</div>}
            {/* Google Review QR */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px dashed #ddd", display: "flex", alignItems: "center", gap: 16 }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(GOOGLE_REVIEW_URL)}&qzone=1&format=png`}
                alt="Google Review QR"
                style={{ width: 80, height: 80, flexShrink: 0, display: "block" }}
              />
              <div>
                <div style={{ fontSize: 11, fontWeight: "bold", color: "#000", marginBottom: 3 }}>Enjoyed your stay?</div>
                <div style={{ fontSize: 10, color: "#555", lineHeight: 1.5 }}>Scan the QR code to leave us<br />a Google review. It helps us grow!</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "22px 48px 22px 28px", background: "#fdfdfd" }}>
          <div style={{ fontSize: 8.5, fontWeight: "bold", letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: 12, textAlign: "right" }}>Bill Summary</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <tbody>
              {[
                ["Subtotal", `₹${bill.subtotal.toLocaleString("en-IN")}`],
                bill.discountAmount > 0 && ["Discount", `- ₹${bill.discountAmount.toLocaleString("en-IN")}`],
                bill.isGstBill && ["CGST", `₹${bill.cgst.toLocaleString("en-IN")}`],
                bill.isGstBill && ["SGST", `₹${bill.sgst.toLocaleString("en-IN")}`],
              ].filter(Boolean).map((row: any, i) => (
                <tr key={i}>
                  <td style={{ paddingBottom: 6, color: "#555" }}>{row[0]}</td>
                  <td style={{ paddingBottom: 6, textAlign: "right", fontFamily: mono }}>{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderTop: "1px solid #000", marginTop: 6, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 12, fontWeight: "bold", letterSpacing: "0.1em", textTransform: "uppercase" }}>Grand Total</span>
            <span style={{ fontSize: 20, fontWeight: "bold", fontFamily: mono, color: "#000" }}>₹{bill.totalAmount.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
