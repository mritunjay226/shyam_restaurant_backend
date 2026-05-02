"use client";

import { useState, Fragment } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, ArrowRight, Printer, Search, X, UtensilsCrossed, Receipt, ChefHat, Thermometer, FileText, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { DesktopTopbar } from "@/components/Topbar";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeftRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type MenuItemType = {
  _id: string;
  name: string;
  price: number;
  categoryId: string;
  category: string;
  dietaryType?: string;
  description?: string;
  image?: string;
  unit?: string;
};

// ── Bill Preview State Type ──
type BillPreviewState = {
  tableNo: string;
  subtotal: number;
  isGstBill: boolean;
  gstin: string;
  paymentMethod: string;
  discount: string;
};

const TABLES = [...Array.from({ length: 8 }).map((_, i) => `T${i + 1}`), "Walk-in", "Takeaway", "Delivery"];

// ── Transfer Dialog Component ──
function TransferDialog({
  outlet,
  fromTable,
  onSuccess
}: {
  outlet: string;
  fromTable: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [transferType, setTransferType] = useState<"table" | "room">("table");
  const [targetTable, setTargetTable] = useState("");
  const [targetRoomId, setTargetRoomId] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);

  const occupiedRooms = useQuery(api.rooms.getOccupiedRoomsWithGuest) || [];
  const transferMutation = useMutation(api.orders.transferTable);

  const handleTransfer = async () => {
    if (transferType === "table" && !targetTable.trim()) {
      toast.error("Please enter a target table number");
      return;
    }
    if (transferType === "room" && !targetRoomId) {
      toast.error("Please select a target room");
      return;
    }

    setIsTransferring(true);
    try {
      await transferMutation({
        outlet,
        fromTableNumber: fromTable,
        toTableNumber: transferType === "table" ? targetTable : undefined,
        toRoomId: transferType === "room" ? (targetRoomId as Id<"rooms">) : undefined,
      });
      toast.success(
        transferType === "table" 
          ? `Transferred orders to Table ${targetTable}` 
          : `Transferred orders to Room ${occupiedRooms.find(r => r._id === targetRoomId)?.roomNumber}`
      );
      setOpen(false);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Failed to transfer orders");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-indigo-50 text-indigo-600"
          />
        }
      >
        <ArrowLeftRight size={16} />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-3xl">
        <DialogHeader>
          <DialogTitle>Transfer Active Orders</DialogTitle>
          <p className="text-xs text-gray-500">Move all KOTs from Table {fromTable} to another destination.</p>
        </DialogHeader>

        <Tabs defaultValue="table" value={transferType} onValueChange={(v: any) => setTransferType(v)} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2 rounded-xl bg-gray-100 p-1">
            <TabsTrigger value="table" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">To Table</TabsTrigger>
            <TabsTrigger value="room" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">To Room</TabsTrigger>
          </TabsList>
          
          <TabsContent value="table" className="pt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700">Target Table Number</Label>
              <Select value={targetTable} onValueChange={(v) => setTargetTable(v || "")}>
                <SelectTrigger className="rounded-xl border-gray-200 bg-white">
                  <SelectValue placeholder="Select target table..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-gray-100 shadow-xl max-h-60 custom-scrollbar">
                  {TABLES.filter(t => t !== fromTable).map((t) => (
                    <SelectItem key={t} value={t} className="rounded-lg focus:bg-indigo-50 focus:text-indigo-700 font-bold text-sm">
                      {t.startsWith("T") && t.length === 2 ? `Table ${t.slice(1)}` : t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-gray-400">If the target table is occupied, the bills will merge.</p>
            </div>
          </TabsContent>

          <TabsContent value="room" className="pt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700">Select Occupied Room</Label>
              <Select value={targetRoomId} onValueChange={(val) => setTargetRoomId(val || "")}>
                <SelectTrigger className="rounded-xl border-gray-200 bg-white">
                  <SelectValue placeholder="Select a room..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-gray-100 shadow-xl">
                  {occupiedRooms.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400">No rooms currently occupied</div>
                  ) : (
                    occupiedRooms.map((room) => (
                      <SelectItem key={room._id} value={room._id} className="rounded-lg focus:bg-indigo-50 focus:text-indigo-700">
                        <div className="flex flex-col items-start px-1">
                          <span className="font-bold text-sm">Room {room.roomNumber}</span>
                          <span className="text-[10px] text-gray-400 font-medium">Guest: {room.guestName}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-gray-400">The bill will be added to the guest's checkout invoice.</p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button 
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase text-xs tracking-wider"
            onClick={handleTransfer}
            disabled={isTransferring}
          >
            {isTransferring ? "Processing Transfer..." : "Confirm Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Cancel KOT Slip Generator ──
const generateCancelKOTSlipHTML = (order: any, tableNo: string, outletName: string) => {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  
  const itemRowsHtml = (order.items || []).map((item: any, idx: number) => {
    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:5px 0;">
        <div style="flex:1;">
          <span style="font-size:14px;font-weight:900;margin-right:6px;"><del>${item.quantity}×</del></span>
          <span style="font-size:13px;font-weight:700;"><del>${item.name}</del></span>
        </div>
      </div>`;
  }).join("");

  return `
  <!-- Header -->
  <div style="text-align:center;margin-bottom:6px;">
    <div style="font-size:11px;letter-spacing:3px;font-weight:600;color:#555;">── SAROVAR OS ──</div>
    <div style="font-size:20px;font-weight:900;letter-spacing:1px;margin:2px 0;color:black;background-color:#eee;padding:2px 0;">CANCELLED KOT</div>
    <div style="font-size:11px;font-weight:700;letter-spacing:4px;color:#333;">${outletName.toUpperCase()}</div>
  </div>
  
  <!-- Divider -->
  <div style="border-top:2px solid #000;margin:6px 0 4px 0;"></div>
  
  <!-- Table + Serial Row -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
    <div>
      <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#666;">TABLE</div>
      <div style="font-size:22px;font-weight:900;line-height:1.1;">${tableNo}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#666;">KOT NO.</div>
      <div style="font-size:13px;font-weight:900;"><del>${order.kotNumber}</del></div>
    </div>
  </div>
  
  <!-- Date/Time -->
  <div style="display:flex;justify-content:space-between;font-size:11px;color:#444;margin-bottom:4px;border-bottom:1px dashed #888;padding-bottom:4px;">
    <span>${dateStr}</span>
    <span>${timeStr}</span>
  </div>
  
  <!-- Items -->
  <div style="margin:2px 0 4px 0;">${itemRowsHtml}</div>
  
  <!-- Total Items Count -->
  <div style="border-top:2px solid #000;padding-top:5px;margin-top:4px;display:flex;justify-content:space-between;font-size:12px;font-weight:900;">
    <span>CANCELLED ITEMS</span>
    <span>${(order.items || []).reduce((a: any, o: any) => a + o.quantity, 0)}</span>
  </div>
  
  <!-- Footer -->
  <div style="border-top:1px dashed #888;margin-top:8px;padding-top:5px;text-align:center;">
    <div style="font-size:10px;font-weight:700;letter-spacing:2px;color:#555;">★ KITCHEN CANCEL COPY ★</div>
    <div style="font-size:9px;color:#999;margin-top:2px;">Please stop preparation immediately</div>
  </div>
  `;
};

// ── Individual Table Bill Card ──
function TableBillCard({
  outlet,
  tableNo,
  orders,
  generateTableBill,
  settings,
}: {
  outlet: string;
  tableNo: string;
  orders: any[];
  generateTableBill: any;
  settings: any;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGstBill, setIsGstBill] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState("");
  const [amountPaidInput, setAmountPaidInput] = useState("");
  const [gstin, setGstin] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const [editingKotId, setEditingKotId] = useState<string | null>(null);
  const [editingItems, setEditingItems] = useState<any[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const updateOrderItems = useMutation(api.orders.updateOrderItems);

  const subtotal = orders.reduce((sum: number, o: any) => sum + o.subtotal, 0);
  const discountAmt = parseFloat(discount) || 0;
  const afterDiscount = Math.max(0, subtotal - discountAmt);
  const cgst = isGstBill ? Math.round(afterDiscount * 0.06 * 100) / 100 : 0;
  const sgst = isGstBill ? Math.round(afterDiscount * 0.06 * 100) / 100 : 0;
  const grandTotal = Math.round((afterDiscount + cgst + sgst) * 100) / 100;

  // Collect all items across KOTs for itemized display
  const allItems = orders.flatMap((o: any) =>
    (o.items || []).map((item: any) => ({
      ...item,
      kotNumber: o.kotNumber,
    }))
  );

  const handleConfirmBill = async () => {
    setIsGenerating(true);
    try {
      const parsedAmountPaid = amountPaidInput.trim() !== "" ? parseFloat(amountPaidInput) : grandTotal;
      await generateTableBill({
        outlet,
        tableNumber: tableNo,
        paymentMethod,
        isGstBill,
        ...(gstin.trim() && { gstin: gstin.trim() }),
        ...(discountAmt > 0 && { discountAmount: discountAmt }),
        amountPaid: parsedAmountPaid,
      });
      toast.success(`✅ Bill generated for ${tableNo} · ₹${grandTotal.toLocaleString()}`);
      setIsExpanded(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate bill");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateQty = (index: number, delta: number) => {
    const newItems = [...editingItems];
    newItems[index].quantity += delta;
    if (newItems[index].quantity < 0) newItems[index].quantity = 0;
    setEditingItems(newItems);
  };

  const handleSaveEdit = async (orderId: string) => {
    setIsSavingEdit(true);
    try {
      const filteredItems = editingItems.filter(i => i.quantity > 0);
      await updateOrderItems({ orderId: orderId as Id<"orders">, items: filteredItems });
      toast.success("KOT updated successfully");
      setEditingKotId(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to update KOT");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCancelKOT = async (order: any) => {
    if (!window.confirm(`Are you sure you want to cancel KOT ${order.kotNumber}?`)) return;
    try {
      // 1. Delete from DB (sending empty items array deletes the order)
      await updateOrderItems({ orderId: order._id as Id<"orders">, items: [] });
      
      // 2. Print Cancel Slip
      const { printReceipt } = await import("@/lib/print");
      const html = generateCancelKOTSlipHTML(order, tableNo, outlet);
      await printReceipt(html, true); // true = thermal printing
      
      toast.success(`KOT ${order.kotNumber} cancelled and slip printed`);
    } catch (e: any) {
      toast.error(e.message || "Failed to cancel KOT");
    }
  };

  const detailsPayload = { orders, subtotal, discountAmt, cgst: isGstBill ? cgst : 0, sgst: isGstBill ? sgst : 0, grandTotal, tableNo, outlet };

  const handlePrintProforma = async (mode: 'thermal' | 'normal') => {
    try {
      const { printReceipt } = await import("@/lib/print");
      const targetId = mode === 'thermal' ? `proforma-thermal-${tableNo}` : `proforma-normal-${tableNo}`;
      const el = document.getElementById(targetId);
      if (el) {
        await printReceipt(el.innerHTML, mode === 'thermal');
      } else {
        toast.error("Print template not found");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to print");
    }
  };

  const PAYMENT_METHODS = [
    { value: "cash", label: "Cash", emoji: "💵" },
    { value: "upi", label: "UPI", emoji: "📱" },
    { value: "card", label: "Card", emoji: "💳" },
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Table Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="font-bold text-gray-900">{tableNo}</h3>
            <p className="text-[10px] text-gray-400 font-bold tracking-widest">{orders.length} ACTIVE KOT(S)</p>
          </div>
          <TransferDialog outlet={outlet} fromTable={tableNo} onSuccess={() => setIsExpanded(false)} />
        </div>
        <div className="text-right">
          <p className="font-black text-gray-900">₹{subtotal.toLocaleString()}</p>
          <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md text-[9px] font-bold uppercase">Unbilled</span>
        </div>
      </div>

      {/* KOT Summary Pills */}
      <div className="px-4 py-2 space-y-2">
        {orders.map((o: any) => {
          if (editingKotId === o._id) {
            return (
              <div key={o._id} className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-indigo-900 border-b border-indigo-200 pb-2">
                  <span>Editing {o.kotNumber}</span>
                  <button onClick={() => setEditingKotId(null)} className="hover:bg-indigo-100 p-1 rounded-full text-indigo-400 hover:text-indigo-900 transition-colors">
                    <X size={14}/>
                  </button>
                </div>
                {editingItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="truncate w-32 flex-1 pr-2">{item.name}</span>
                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg shadow-sm border border-indigo-50">
                      <button onClick={() => handleUpdateQty(idx, -1)} className="text-gray-400 hover:text-red-500">
                        {item.quantity === 1 || item.quantity === 0 ? <Trash2 size={12}/> : <Minus size={12}/>}
                      </button>
                      <span className="font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => handleUpdateQty(idx, 1)} className="text-gray-400 hover:text-emerald-500">
                        <Plus size={12}/>
                      </button>
                    </div>
                  </div>
                ))}
                {editingItems.length === 0 || editingItems.every(i => i.quantity === 0) ? (
                  <div className="text-[10px] text-red-500 text-center font-semibold pt-1">This KOT will be deleted because it is empty.</div>
                ) : null}
                <Button 
                  onClick={() => handleSaveEdit(o._id)} 
                  disabled={isSavingEdit}
                  className="w-full h-8 mt-2 text-[10px] uppercase font-bold tracking-wider bg-indigo-600 hover:bg-indigo-700 rounded-lg" 
                  size="sm"
                >
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            );
          }

          return (
            <div key={o._id} className="flex justify-between items-center text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 group transition-colors hover:bg-white hover:border-gray-200 hover:shadow-sm">
              <span className="font-semibold">{o.kotNumber}</span>
              <div className="flex items-center gap-3">
                <span>₹{o.subtotal?.toLocaleString()}</span>
                <button 
                  onClick={() => {
                    setEditingKotId(o._id);
                    setEditingItems(JSON.parse(JSON.stringify(o.items || [])));
                  }} 
                  className="opacity-0 group-hover:opacity-100 text-indigo-500 hover:text-indigo-700 transition-opacity p-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-md"
                  title="Edit KOT Items"
                >
                  <Pencil size={12} />
                </button>
                <button 
                  onClick={() => handleCancelKOT(o)}
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity p-1.5 bg-red-50 hover:bg-red-100 rounded-md"
                  title="Cancel KOT"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bill Preview Panel */}
      {isExpanded && (
        <div className="border-t border-gray-100 mx-4 mb-4 mt-2 pt-4 space-y-4">

          {/* Itemized Items */}
          {allItems.length > 0 && (
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Order Items</p>
              <div className="space-y-1 max-h-48 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {allItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-gray-50">
                    <div className="min-w-0 flex-1">
                      <span className="text-gray-800 font-medium truncate block">{item.name}</span>
                      <span className="text-gray-400">×{item.quantity} @ ₹{item.price}</span>
                    </div>
                    <span className="font-semibold text-gray-900 shrink-0 ml-2">
                      ₹{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GST Toggle */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
            <div>
              <p className="text-xs font-bold text-gray-700">GST Invoice</p>
              <p className="text-[10px] text-gray-400">CGST 6% + SGST 6% on subtotal</p>
            </div>
            <Switch checked={isGstBill} onCheckedChange={setIsGstBill} />
          </div>

          {/* GSTIN (only if GST bill) */}
          {isGstBill && (
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">GSTIN (Optional)</Label>
              <Input
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="e.g. 07AABCU9603R1ZV"
                className="h-8 text-xs rounded-xl"
              />
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Company / Organisation name"
                className="h-8 text-xs rounded-xl"
              />
            </div>
          )}

          {/* Discount */}
          <div>
            <Label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Discount (₹)</Label>
            <Input
              type="number"
              min={0}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0"
              className="h-8 text-xs rounded-xl"
            />
          </div>

          {/* Payment Method */}
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setPaymentMethod(m.value)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2 rounded-xl border text-xs font-bold transition-all",
                    paymentMethod === m.value
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-gray-50 text-gray-500 border-gray-100 hover:border-gray-300"
                  )}
                >
                  <span className="text-base">{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Paid */}
          <div>
            <Label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Amount Paid Today (₹)</Label>
            <Input
              type="number"
              min={0}
              max={grandTotal}
              value={amountPaidInput}
              onChange={(e) => setAmountPaidInput(e.target.value)}
              placeholder={`₹${grandTotal.toLocaleString()} (Full Amount)`}
              className="h-8 text-xs rounded-xl border-emerald-200 focus-visible:ring-emerald-500"
            />
            {amountPaidInput && parseFloat(amountPaidInput) < grandTotal && (
              <p className="text-[10px] text-amber-600 font-bold mt-1.5 ml-1">
                Amount Due: ₹{(grandTotal - parseFloat(amountPaidInput)).toLocaleString()}
              </p>
            )}
          </div>

          {/* Bill Breakdown */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-xs">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Bill Summary</p>
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString()}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>− ₹{discountAmt.toLocaleString()}</span>
              </div>
            )}
            {isGstBill && (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>CGST @ 6%</span>
                  <span>₹{cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>SGST @ 6%</span>
                  <span>₹{sgst.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-black text-gray-900 pt-2 border-t border-gray-200 text-sm">
              <span>Grand Total</span>
              <span>₹{grandTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsExpanded(false)}
              className="flex-1 h-9 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBill}
              disabled={isGenerating}
              className="flex-1 h-9 bg-gray-900 text-white hover:bg-gray-700 font-bold text-xs rounded-xl uppercase"
            >
              {isGenerating ? "Generating..." : `Confirm · ₹${grandTotal.toLocaleString()}`}
            </Button>
          </div>
        </div>
      )}

      {/* Generate Bill Trigger */}
      {!isExpanded && (
        <div className="px-4 pb-4 space-y-2 mt-2">
          <Button
            onClick={() => setIsExpanded(true)}
            className="w-full bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-100 transition-colors font-bold h-9 rounded-xl text-xs uppercase"
          >
            Generate Bill
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handlePrintProforma('thermal')}
              className="flex-1 h-9 text-xs font-bold rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-gray-200"
            >
              <Thermometer size={14} className="mr-1.5" /> Thermal
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePrintProforma('normal')}
              className="flex-1 h-9 text-xs font-bold rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-gray-200"
            >
              <FileText size={14} className="mr-1.5" /> A4 Bill
            </Button>
          </div>
        </div>
      )}

      {/* Hidden Print Targets */}
      <div className="absolute -top-[9999px] -left-[9999px] invisible opacity-0 pointer-events-none">
        <div id={`proforma-thermal-${tableNo}`}>
          <ProformaThermalReceipt details={detailsPayload} settings={settings} />
        </div>
        <div id={`proforma-normal-${tableNo}`}>
          <ProformaNormalInvoice details={detailsPayload} settings={settings} />
        </div>
      </div>
    </div>
  );
}

// ── Local Active Orders Component ──
function ActiveOrdersList({ outlet }: { outlet: string }) {
  const activeOrders = useQuery(api.orders.getActiveOrdersByOutlet, { outlet });
  const generateTableBill = useMutation(api.billing.generateTableBill);
  const settings = useQuery(api.settings.getHotelSettings);

  if (activeOrders === undefined) return <p className="text-center text-sm text-gray-400 mt-10">Loading...</p>;
  if (activeOrders.length === 0) return <p className="text-center text-sm text-gray-400 mt-10">No active KOTs running.</p>;

  // Group by table
  const grouped = activeOrders.reduce((acc, order) => {
    if (!acc[order.tableNumber]) acc[order.tableNumber] = [];
    acc[order.tableNumber].push(order);
    return acc;
  }, {} as Record<string, typeof activeOrders>);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([tableNo, orders]) => (
        <TableBillCard
          key={tableNo}
          outlet={outlet}
          tableNo={tableNo}
          orders={orders}
          generateTableBill={generateTableBill}
          settings={settings}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Proforma Print Components
// ─────────────────────────────────────────────────────────────────────────────
const GOOGLE_REVIEW_URL = "https://g.page/r/CRoioQu179CPEBM/review";

function ProformaThermalReceipt({ details, settings }: any) {
  const { orders, subtotal, discountAmt, cgst, sgst, grandTotal, tableNo, outlet } = details;
  const now = new Date();

  const solidDivider = () => <div className="thermal-solid-divider" style={{ borderTop: "1px solid #000", margin: "5px 0" }} />;
  const dashedDivider = () => <div className="thermal-dashed-divider" style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />;

  const row = (label: string, value: string, bold = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: bold ? "bold" : "normal", fontSize: bold ? 12 : 10.5, marginBottom: 2 }}>
      <span style={{ color: "#000" }}>{label}</span>
      <span style={{ color: "#000", fontFamily: "'Courier New', monospace" }}>{value}</span>
    </div>
  );

  const hotelName = settings?.hotelName || "Hotel Name";
  const address = settings?.address || "Address";
  const phone = settings?.phone || "";
  const gstin = settings?.gstin || "";

  const outletName = (o: string) => o.replace(/shyam-/i, "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div style={{ color: "#000", background: "#fff", fontFamily: "'Courier New', Courier, monospace", width: "100%", margin: 0, padding: 0 }}>
      <div className="thermal-center" style={{ textAlign: "center", marginBottom: 2 }}>
        <div style={{ borderTop: "2px solid #000", marginBottom: 6 }} />
        <div style={{ fontSize: 17, fontWeight: "bold", letterSpacing: "0.12em", textTransform: "uppercase" }}>{hotelName}</div>
        <div style={{ fontSize: 9, letterSpacing: "0.06em", marginTop: 2 }}>─── ✦ ───</div>
        <div style={{ fontSize: 10, marginTop: 3, letterSpacing: "0.04em" }}>{address}</div>
        {phone && <div style={{ fontSize: 10 }}>Tel: {phone}</div>}
        {cgst > 0 && gstin && <div style={{ fontSize: 9, marginTop: 2 }}>GSTIN: {gstin}</div>}
        <div style={{ borderTop: "2px solid #000", marginTop: 6 }} />
      </div>

      <div className="thermal-center" style={{ textAlign: "center", fontWeight: "bold", fontSize: 11, letterSpacing: "0.15em", marginTop: 5, marginBottom: 5 }}>
        ★ PROFORMA ESTIMATE ★
      </div>

      {solidDivider()}
      {row("Date & Time", format(now, "dd/MM/yyyy HH:mm"))}
      {dashedDivider()}
      {row("Outlet", outletName(outlet))}
      {row("Table No.", tableNo)}
      {solidDivider()}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", paddingBottom: 3, fontWeight: "bold", fontSize: 10, borderBottom: "1px solid #000" }}>ITEM</th>
            <th style={{ textAlign: "right", paddingBottom: 3, fontWeight: "bold", fontSize: 10, borderBottom: "1px solid #000" }}>QTY</th>
            <th style={{ textAlign: "right", paddingBottom: 3, fontWeight: "bold", fontSize: 10, borderBottom: "1px solid #000" }}>RATE</th>
            <th style={{ textAlign: "right", paddingBottom: 3, fontWeight: "bold", fontSize: 10, borderBottom: "1px solid #000" }}>AMT</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o: any) => (
             <Fragment key={o._id}>
               {o.items?.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ paddingLeft: 6, fontSize: 9, wordBreak: "break-word" }}>{item.name}</td>
                    <td style={{ textAlign: "right", fontSize: 9, whiteSpace: "nowrap" }}>{item.quantity}</td>
                    <td style={{ textAlign: "right", fontSize: 9, whiteSpace: "nowrap" }}>{item.price}</td>
                    <td style={{ textAlign: "right", fontSize: 9, whiteSpace: "nowrap" }}>{(item.quantity * item.price).toLocaleString("en-IN")}</td>
                  </tr>
               ))}
             </Fragment>
          ))}
        </tbody>
      </table>

      {solidDivider()}
      
      {row("Subtotal", `Rs.${subtotal.toLocaleString("en-IN")}`)}
      {discountAmt > 0 && row("Discount", `- Rs.${discountAmt.toLocaleString("en-IN")}`)}
      {cgst > 0 && (
        <>
          {row(`CGST`, `Rs.${cgst.toLocaleString("en-IN")}`)}
          {row(`SGST`, `Rs.${sgst.toLocaleString("en-IN")}`)}
        </>
      )}

      {solidDivider()}

      <div className="thermal-total-row" style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 14, marginBottom: 2, letterSpacing: "0.04em" }}>
        <span>ESTIMATE TOTAL</span>
        <span>Rs.{grandTotal.toLocaleString("en-IN")}</span>
      </div>

      {solidDivider()}

      <div className="thermal-center" style={{ textAlign: "center", fontSize: 10, marginTop: 6, lineHeight: 1.7 }}>
        <div style={{ fontWeight: "bold", letterSpacing: "0.06em" }}>Please review before payment</div>
        <div style={{ marginTop: 6, fontSize: 9, letterSpacing: "0.18em" }}>— ✦ —</div>
        {/* Google Review QR */}
        <div style={{ marginTop: 8, borderTop: "1px dashed #000", paddingTop: 8 }}>
          <div style={{ fontSize: 8, letterSpacing: "0.1em", marginBottom: 4 }}>ENJOYED YOUR VISIT? LEAVE US A REVIEW</div>
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

function ProformaNormalInvoice({ details, settings }: any) {
  const { orders, subtotal, discountAmt, cgst, sgst, grandTotal, tableNo, outlet } = details;
  const now = new Date();
  
  const mono = "'Courier New', Courier, monospace";
  const sans = "'Inter', system-ui, sans-serif";

  const hotelName = settings?.hotelName || "Hotel Name";
  const address = settings?.address || "Address";
  const phone = settings?.phone || "";
  const gstin = settings?.gstin || "";
  const email = settings?.email || "";
  const website = settings?.website || "";

  const outletName = (o: string) => o.replace(/shyam-/i, "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div style={{ fontFamily: sans, color: "#000", background: "#fff", width: "100%", margin: 0, padding: 0 }}>
      {/* Header */}
      <div style={{ padding: "40px 48px", borderBottom: "1px solid #eaeaea", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: "900", letterSpacing: "-0.02em", color: "#111" }}>{hotelName}</div>
          <div style={{ fontSize: 10, color: "#666", marginTop: 8, lineHeight: 1.5, maxWidth: 220 }}>
            {address}<br/>
            {phone && <>Tel: {phone}<br/></>}
            {email && <>{email}<br/></>}
            {website && <>{website}</>}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: "100", letterSpacing: "-0.02em", color: "#ccc", textTransform: "uppercase" }}>
            ESTIMATE
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Date</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#111", fontFamily: mono }}>{format(now, "dd MMM yyyy")}</div>
          </div>
          {cgst > 0 && gstin && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>GSTIN</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#111", fontFamily: mono }}>{gstin}</div>
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div style={{ padding: "32px 48px", display: "flex", justifyContent: "space-between", background: "#fafafa" }}>
        <div>
          <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 4 }}>Bill To</div>
          <div style={{ fontSize: 14, fontWeight: "bold", color: "#111" }}>Walk-in Guest</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 4 }}>Service Area</div>
          <div style={{ fontSize: 14, fontWeight: "bold", color: "#111" }}>{outletName(outlet)} - {tableNo}</div>
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: "32px 48px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", paddingBottom: 12, borderBottom: "2px solid #000", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888", fontWeight: 600 }}>Description</th>
              <th style={{ textAlign: "center", paddingBottom: 12, borderBottom: "2px solid #000", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888", fontWeight: 600, width: "10%" }}>Qty</th>
              <th style={{ textAlign: "right", paddingBottom: 12, borderBottom: "2px solid #000", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888", fontWeight: 600, width: "20%" }}>Rate</th>
              <th style={{ textAlign: "right", paddingBottom: 12, borderBottom: "2px solid #000", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888", fontWeight: 600, width: "20%" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o: any) => (
              <Fragment key={o._id}>
                {o.items?.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ padding: "12px 0", borderBottom: "1px solid #eaeaea", fontSize: 12, color: "#111" }}>{item.name}</td>
                    <td style={{ padding: "12px 0", borderBottom: "1px solid #eaeaea", fontSize: 12, color: "#555", textAlign: "center" }}>{item.quantity}</td>
                    <td style={{ padding: "12px 0", borderBottom: "1px solid #eaeaea", fontSize: 12, color: "#555", textAlign: "right", fontFamily: mono }}>{item.price.toLocaleString("en-IN")}</td>
                    <td style={{ padding: "12px 0", borderBottom: "1px solid #eaeaea", fontSize: 12, color: "#111", textAlign: "right", fontFamily: mono, fontWeight: 500 }}>{(item.quantity * item.price).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>

        {/* Footer / Summary */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32 }}>
          <div style={{ flex: 1, paddingRight: 48 }}>
            <div style={{ background: "#f5f5f5", padding: "16px", borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: "bold", color: "#000", marginBottom: 3 }}>This is an Estimate</div>
              <div style={{ fontSize: 10, color: "#555", lineHeight: 1.5 }}>Please review the items before generating the final bill.</div>
            </div>

            {/* Google Review QR */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px dashed #ddd", display: "flex", alignItems: "center", gap: 16 }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(GOOGLE_REVIEW_URL)}&qzone=1&format=png`}
                alt="Google Review QR"
                style={{ width: 80, height: 80, flexShrink: 0, display: "block" }}
              />
              <div>
                <div style={{ fontSize: 11, fontWeight: "bold", color: "#000", marginBottom: 3 }}>Enjoyed your visit?</div>
                <div style={{ fontSize: 10, color: "#555", lineHeight: 1.5 }}>Scan the QR code to leave us<br />a Google review. It helps us grow!</div>
              </div>
            </div>
          </div>

          <div style={{ width: 280, background: "#fdfdfd", padding: "22px", border: "1px solid #eaeaea", borderRadius: 8 }}>
            <div style={{ fontSize: 8.5, fontWeight: "bold", letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: 12, textAlign: "right" }}>Estimate Summary</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <tbody>
                {[
                  ["Subtotal", `₹${subtotal.toLocaleString("en-IN")}`],
                  discountAmt > 0 && ["Discount", `- ₹${discountAmt.toLocaleString("en-IN")}`],
                  cgst > 0 && ["CGST", `₹${cgst.toLocaleString("en-IN")}`],
                  cgst > 0 && ["SGST", `₹${sgst.toLocaleString("en-IN")}`],
                ].filter(Boolean).map((row: any, i) => (
                  <tr key={i}>
                    <td style={{ paddingBottom: 6, color: "#555" }}>{row[0]}</td>
                    <td style={{ paddingBottom: 6, textAlign: "right", fontFamily: mono }}>{row[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ borderTop: "1px solid #000", marginTop: 6, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 12, fontWeight: "bold", letterSpacing: "0.1em", textTransform: "uppercase" }}>Total</span>
              <span style={{ fontSize: 20, fontWeight: "bold", fontFamily: mono, color: "#000" }}>₹{grandTotal.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


interface POSProps {
  title: string;
  items: MenuItemType[];
  categories: { _id: string; name: string }[];
  accentColorClass: string;
  accentBorderClass: string;
  accentTextClass: string;
  outlet: string;
}

interface CartItem extends MenuItemType {
  cartItemId: string;
  qty: number;
  notes?: string;
  course?: string;
}

export function POSMenu({ title, items, categories, accentColorClass, accentBorderClass, accentTextClass, outlet }: POSProps) {
  const [activeTable, setActiveTable] = useState("T1");
  const [activeCategory, setActiveCategory] = useState<string | undefined>();
  const effectiveCategory = activeCategory || categories[0]?._id;
  const [carts, setCarts] = useState<Record<string, CartItem[]>>({});
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false);
  const [linkToRoom, setLinkToRoom] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<Id<"rooms"> | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const createOrder = useMutation(api.orders.createOrder);
  const directCheckout = useMutation(api.billing.directCheckoutOrder);
  const occupiedRooms = useQuery(api.rooms.getOccupiedRoomsWithGuest) || [];
  const activeOrders = useQuery(api.orders.getActiveOrdersByOutlet, { outlet }) || [];

  const currentCart = carts[activeTable] || [];

  // Filter by category first, then by search
  const filteredItems = items.filter(i => {
    const matchesCategory = i.categoryId === effectiveCategory;
    const matchesSearch = search === "" ||
      i.name.toLowerCase().includes(search.toLowerCase());
    return search ? matchesSearch : matchesCategory;
  });

  const addToCart = (item: MenuItemType | CartItem) => {
    setCarts(prev => {
      const tableCart = prev[activeTable] || [];
      const cartItemIdToMatch = (item as CartItem).cartItemId;
      let existingIndex = -1;
      
      if (cartItemIdToMatch) {
        existingIndex = tableCart.findIndex(i => i.cartItemId === cartItemIdToMatch);
      } else {
        existingIndex = tableCart.findIndex(i => i._id === item._id && !i.notes && i.course === "Main");
      }

      if (existingIndex >= 0) {
        const newCart = [...tableCart];
        newCart[existingIndex] = { ...newCart[existingIndex], qty: newCart[existingIndex].qty + 1 };
        return { ...prev, [activeTable]: newCart };
      } else {
        return { ...prev, [activeTable]: [...tableCart, { ...item, qty: 1, cartItemId: Math.random().toString(36).substring(2, 9), notes: "", course: "Main" }] };
      }
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCarts(prev => {
      const tableCart = prev[activeTable] || [];
      const existing = tableCart.find(i => i.cartItemId === cartItemId);
      const updatedTableCart = existing && existing.qty > 1
        ? tableCart.map(i => i.cartItemId === cartItemId ? { ...i, qty: i.qty - 1 } : i)
        : tableCart.filter(i => i.cartItemId !== cartItemId);
      return { ...prev, [activeTable]: updatedTableCart };
    });
  };

  const updateCartItemField = (cartItemId: string, field: "notes" | "course", value: string) => {
    setCarts(prev => {
      const tableCart = (prev[activeTable] || []).map(i => i.cartItemId === cartItemId ? { ...i, [field]: value } : i);
      return { ...prev, [activeTable]: tableCart };
    });
  };

  const clearCurrentCart = () => {
    setCarts(prev => { const n = { ...prev }; delete n[activeTable]; return n; });
    setIsOrderSheetOpen(false);
  };

  const handlePrintKOT = async () => {
    setIsSubmitting(true);
    try {
      let roomIdToLink: Id<"rooms"> | undefined = undefined;
      if (linkToRoom && selectedRoomId) {
        roomIdToLink = selectedRoomId as Id<"rooms">;
      }
      await createOrder({
        outlet,
        tableNumber: activeTable,
        roomId: roomIdToLink,
        items: currentCart.map(c => ({ 
          menuItemId: c._id as any, 
          name: c.name, 
          price: c.price, 
          quantity: c.qty, 
          category: c.category || "Uncategorized",
          notes: c.notes || undefined,
          course: c.course || undefined
        }))
      });
      toast.success(`KOT for ${activeTable} created!`);
      clearCurrentCart();
    } catch (e) {
      toast.error("Failed to create order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectCheckout = async () => {
    setIsSubmitting(true);
    try {
      await directCheckout({
        outlet,
        tableNumber: activeTable,
        items: currentCart.map(c => ({ 
          menuItemId: c._id as any, 
          name: c.name, 
          price: c.price, 
          quantity: c.qty, 
          category: c.category || "Uncategorized",
          notes: c.notes || undefined,
          course: c.course || undefined
        })),
        paymentMethod: "cash",
        isGstBill: true,
      });
      toast.success(`Quick checkout for ${activeTable} done!`);
      clearCurrentCart();
    } catch (e) {
      toast.error("Failed to complete checkout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalItems = currentCart.reduce((acc, o) => acc + o.qty, 0);
  const subtotal = currentCart.reduce((acc, o) => acc + o.qty * o.price, 0);

  // ── Kitchen Slip Print ──────────────────────────────────────────────────────
  const printKOTSlip = () => {
    if (currentCart.length === 0) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const kotSerial = `KOT-${Date.now().toString().slice(-6)}`;

    const itemRowsHtml = currentCart.map((item, idx) => {
      const isLast = idx === currentCart.length - 1;
      const courseTag = item.course && item.course !== "Main"
        ? `<span style="background:#000;color:#fff;font-size:9px;padding:1px 4px;border-radius:2px;margin-left:4px;vertical-align:middle;">${item.course.toUpperCase()}</span>`
        : "";
      const noteHtml = item.notes
        ? `<div style="font-size:11px;color:#444;padding-left:28px;margin-top:1px;font-style:italic;">↳ ${item.notes}</div>`
        : "";
      return `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:5px 0;${!isLast ? 'border-bottom:1px dotted #ccc;' : ''}">
          <div style="flex:1;">
            <span style="font-size:14px;font-weight:900;margin-right:6px;">${item.qty}×</span>
            <span style="font-size:13px;font-weight:700;">${item.name}</span>${courseTag}
            ${noteHtml}
          </div>
        </div>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>KOT Kitchen Slip</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 13px;
    width: 302px;
    padding: 8px 6px 12px 6px;
    color: #000;
    background: #fff;
  }
  @media print {
    @page { margin: 0; size: 80mm auto; }
    body { width: 100%; padding: 4px; }
  }
</style>
</head>
<body>

  <!-- Header -->
  <div style="text-align:center;margin-bottom:6px;">
    <div style="font-size:11px;letter-spacing:3px;font-weight:600;color:#555;">── SAROVAR OS ──</div>
    <div style="font-size:20px;font-weight:900;letter-spacing:1px;margin:2px 0;">KITCHEN ORDER</div>
    <div style="font-size:11px;font-weight:700;letter-spacing:4px;color:#333;">${title.toUpperCase()}</div>
  </div>

  <!-- Divider -->
  <div style="border-top:2px solid #000;margin:6px 0 4px 0;"></div>

  <!-- Table + Serial Row -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
    <div>
      <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#666;">TABLE</div>
      <div style="font-size:22px;font-weight:900;line-height:1.1;">${activeTable}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#666;">KOT NO.</div>
      <div style="font-size:13px;font-weight:900;">${kotSerial}</div>
    </div>
  </div>

  <!-- Date/Time -->
  <div style="display:flex;justify-content:space-between;font-size:11px;color:#444;margin-bottom:4px;border-bottom:1px dashed #888;padding-bottom:4px;">
    <span>${dateStr}</span>
    <span>${timeStr}</span>
  </div>

  <!-- Column Headers -->
  <div style="display:flex;justify-content:space-between;font-size:9px;font-weight:700;letter-spacing:2px;color:#888;padding:3px 0;border-bottom:1px solid #000;">
    <span>QTY  ITEM</span>
    <span>OUTLET</span>
  </div>

  <!-- Items -->
  <div style="margin:2px 0 4px 0;">${itemRowsHtml}</div>

  <!-- Total Items Count -->
  <div style="border-top:2px solid #000;padding-top:5px;margin-top:4px;display:flex;justify-content:space-between;font-size:12px;font-weight:900;">
    <span>TOTAL ITEMS</span>
    <span>${currentCart.reduce((a, o) => a + o.qty, 0)}</span>
  </div>

  <!-- Footer -->
  <div style="border-top:1px dashed #888;margin-top:8px;padding-top:5px;text-align:center;">
    <div style="font-size:10px;font-weight:700;letter-spacing:2px;color:#555;">★ KITCHEN COPY — NOT A BILL ★</div>
    <div style="font-size:9px;color:#999;margin-top:2px;">Please prepare in order received</div>
  </div>

</body>
</html>`;

    // Use Electron IPC if available, else fallback to hidden iframe
    if (typeof window !== "undefined" && (window as any).electronAPI?.print) {
      (window as any).electronAPI.print(html, true).catch(() => {
        toast.error("Printer error. Check connection.");
      });
    } else {
      // Browser fallback — hidden iframe
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;";
      document.body.appendChild(iframe);
      const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iDoc) {
        iDoc.open();
        iDoc.write(html);
        iDoc.close();
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }
      setTimeout(() => document.body.removeChild(iframe), 2000);
    }

    toast.success(`🖨 Kitchen slip sent for ${activeTable}`);
  };

  // Tax Logic: Detect Beverages vs Food based on category name
  const isBeverage = (catName?: string) => {
    const name = catName?.toLowerCase() || "";
    return name.includes("coffee") || name.includes("tea") || name.includes("mocktail") || name.includes("beverage") || name.includes("cold brew");
  };

  const foodItems = currentCart.filter(i => !isBeverage(i.category));
  const beverageItems = currentCart.filter(i => isBeverage(i.category));

  const foodGST = foodItems.reduce((a, o) => a + o.qty * o.price, 0) * 0.05;
  const bevGST = beverageItems.reduce((a, o) => a + o.qty * o.price, 0) * 0.18;
  const grandTotal = subtotal + foodGST + bevGST;

  return (
    /* Page wrapper: flex column */
    <div className="flex flex-col flex-1 w-full min-w-0 bg-gray-50/50">
      <DesktopTopbar title={title} outlet={outlet} />

      <div className="flex-1 flex flex-col min-w-0 w-full max-w-7xl mx-auto px-4 pt-3 pb-36 sm:px-6 sm:pt-5 lg:px-8">

        {/* ── Header ── */}
        <div className="mb-4 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">POS Terminal</p>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">{title} Orders</h1>
          </div>
          
          <div className="relative">
            <Sheet>
              <SheetTrigger 
                render={
                  <Button variant="outline" className="h-10 rounded-xl gap-2 font-bold text-gray-700 bg-white shadow-sm border border-gray-200 shrink-0" />
                }
              >
                <Receipt className="w-4 h-4" />
                <span className="hidden sm:inline">Active KOTs</span>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-gray-50/50">
                <SheetHeader className="p-6 bg-white border-b border-gray-100 shrink-0">
                  <SheetTitle className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-500" />
                    Active KOTs
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                   <ActiveOrdersList outlet={outlet} />
                </div>
              </SheetContent>
            </Sheet>
            
            {activeOrders.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[20px] h-[20px] bg-red-600 text-white text-[10px] font-black rounded-full ring-2 ring-white shadow-lg animate-in zoom-in duration-300 pointer-events-none">
                {activeOrders.length}
              </span>
            )}
          </div>
        </div>

        {/* ── Table Selector ── */}
        <div className="mb-4">
          <div
            className="flex flex-nowrap gap-1.5 overflow-x-auto pb-2 custom-scrollbar scrollbar-hide sm:scrollbar-default scroll-smooth w-full"
          >
            {Array.from(new Set([...TABLES, ...activeOrders.map(o => o.tableNumber)])).map(t => {
              const hasActiveOrder = activeOrders.some(o => o.tableNumber === t);
              return (
              <button
                key={t}
                id={`table-${t}`}
                onClick={(e) => {
                  setActiveTable(t);
                  // Smoothly scroll the container to center the selected table
                  const target = e.currentTarget;
                  const container = target.parentElement;
                  if (container) {
                    const scrollLeft = target.offsetLeft - (container.clientWidth / 2) + (target.clientWidth / 2);
                    container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                  }
                }}
                className={cn(
                  "px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 border",
                  activeTable === t
                    ? (hasActiveOrder 
                        ? "bg-red-600 border-red-600 text-white shadow-md shadow-red-200"
                        : "bg-gray-900 border-gray-900 text-white shadow-md shadow-gray-200")
                    : (hasActiveOrder
                        ? "bg-red-50/50 border-red-500 text-red-600 hover:bg-red-100 hover:border-red-600"
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-900")
                )}
              >
                {t.startsWith("T") && t.length === 2 ? `Table ${t.slice(1)}` : t}
              </button>
            )})}
          </div>
        </div>

        {/* ── Search Bar ── */}
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); }}
            placeholder="Search dishes & drinks…"
            className="w-full h-10 pl-9 pr-9 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 shadow-sm transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* ── Category Rail ── only shown when not searching */}
        {!search && (
          <div
            className="flex flex-nowrap gap-1.5 mb-5 overflow-x-auto pb-2 custom-scrollbar scrollbar-hide sm:scrollbar-default scroll-smooth w-full"
          >
            {categories.map(c => (
              <button
                key={c._id}
                id={`cat-${c._id}`}
                onClick={(e) => {
                  setActiveCategory(c._id);
                  // Smoothly scroll the container, not the whole page
                  const target = e.currentTarget;
                  const container = target.parentElement;
                  if (container) {
                    const scrollLeft = target.offsetLeft - (container.clientWidth / 2) + (target.clientWidth / 2);
                    container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                  }
                }}
                className={cn(
                  "px-4 py-2 rounded-full text-xs sm:text-sm font-bold border transition-all whitespace-nowrap shrink-0",
                  effectiveCategory === c._id
                    ? "bg-gray-900 border-gray-900 text-white shadow-md shadow-gray-200"
                    : "bg-white border-gray-100 text-gray-500 hover:text-gray-900 hover:border-gray-300"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Search mode label */}
        {search && (
          <p className="text-xs font-semibold text-gray-400 mb-4">
            {filteredItems.length} result{filteredItems.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          <AnimatePresence mode="popLayout">
            {filteredItems.map(item => (
              <motion.div
                key={item._id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "group relative overflow-hidden bg-white rounded-3xl border border-gray-100 shadow-sm transition-all duration-300 ease-out cursor-pointer p-4 md:p-5 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/50 hover:border-gray-200",
                  currentCart.find(i => i._id === item._id) && "ring-2 ring-gray-900 ring-offset-2"
                )}
                onClick={() => addToCart(item)}
              >
                <div className="flex flex-col h-full justify-between gap-4">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] leading-none mt-1">
                        {item.category}
                      </p>
                      
                      {/* Authentic Veg/Non-Veg Indian Standard Indicator */}
                      {item.dietaryType && (
                        <div className={cn(
                          "flex items-center justify-center w-3.5 h-3.5 border shrink-0 bg-white shadow-sm",
                          item.dietaryType === "veg" ? "border-green-600" : 
                          item.dietaryType === "non-veg" ? "border-red-600" : "border-yellow-600"
                        )}>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            item.dietaryType === "veg" ? "bg-green-600" : 
                            item.dietaryType === "non-veg" ? "bg-red-600" : "bg-yellow-600"
                          )} />
                        </div>
                      )}
                    </div>
                    
                    <h4 className="font-extrabold text-gray-900 text-sm sm:text-base leading-tight">
                      {item.name}
                    </h4>
                    
                    {item.description && (
                      <p className="text-[10px] text-gray-500 font-medium mt-1.5 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-end justify-between pt-2">
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-gray-900 tabular-nums">
                        ₹{item.price}
                      </span>
                      {item.unit && (
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Per {item.unit}</span>
                      )}
                    </div>

                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 group-hover:bg-gray-900 transition-all duration-300 shadow-sm group-active:scale-90",
                      currentCart.find(i => i._id === item._id) && "bg-gray-900 text-white"
                    )}>
                      {currentCart.find(i => i._id === item._id) ? (
                        <span className="text-[10px] font-black">{currentCart.find(i => i._id === item._id)?.qty}×</span>
                      ) : (
                        <Plus className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>


        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Search className="w-7 h-7 text-gray-300" />
            </div>
            <h3 className="font-bold text-gray-900">Nothing found</h3>
            <p className="text-sm text-gray-400 mt-1">
              {search ? `No items match "${search}"` : `No items in this category`}
            </p>
          </div>
        )}
      </div>

      {/* ── Floating Cart Bar ── */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            key={activeTable}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-16 md:bottom-6 left-0 right-0 px-3 sm:px-6 z-40 print:hidden"
          >
            <div className="max-w-lg mx-auto">
              <div className={cn(
                "rounded-2xl p-2 flex items-center justify-between shadow-2xl",
                outlet === "cafe" ? "bg-teal-900 shadow-teal-900/30" : "bg-gray-900 shadow-gray-900/30"
              )}>
                <div className="flex items-center gap-3 pl-3">
                  <div className="relative">
                    <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                    <span className={cn(
                      "absolute -top-1 -right-1 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2",
                      outlet === "cafe" ? "bg-teal-400 border-teal-950 text-teal-950" : "bg-indigo-400 border-gray-900 text-white"
                    )}>
                      {totalItems}
                    </span>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest leading-none mb-0.5">Payable</p>
                    <p className="text-lg font-black text-white tracking-tight">₹{grandTotal.toLocaleString()}</p>
                  </div>
                </div>
                <Button
                  onClick={() => setIsOrderSheetOpen(true)}
                  className="h-11 px-5 rounded-xl bg-white text-gray-900 hover:bg-white/90 font-black text-xs uppercase tracking-wider"
                >
                  Review
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Checkout Modal ── */}
      <AnimatePresence>
        {isOrderSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOrderSheetOpen(false)}
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative bg-white w-full sm:rounded-4xl sm:max-w-lg sm:mx-4 overflow-hidden flex flex-col max-h-[92dvh] rounded-t-4xl"
            >
              {/* Modal Header */}
              <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-black text-gray-900">Review Order</h2>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mt-0.5">{activeTable} · {totalItems} items</p>
                </div>
                <button
                  onClick={() => setIsOrderSheetOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X size={16} className="text-gray-600" />
                </button>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {currentCart.map(item => (
                  <div key={item.cartItemId} className="flex gap-3 relative bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-black text-gray-800 text-sm shrink-0 border border-gray-100 shadow-sm">
                      {item.qty}×
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                       <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm truncate">{item.name}</h4>
                            <p className="text-[10px] text-gray-400 font-bold tracking-wider">₹{item.price} EACH</p>
                          </div>
                          <span className="font-black text-gray-900 text-sm tabular-nums shrink-0 ml-2 mt-0.5">₹{(item.price * item.qty).toLocaleString()}</span>
                       </div>

                       {/* Controls */}
                       <div className="flex flex-col gap-2 w-full mt-1">
                          <input 
                            type="text" 
                            placeholder="Add note (e.g. No onion)..." 
                            className="bg-white border border-gray-200 rounded-lg h-8 px-2.5 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 w-full transition-all"
                            value={item.notes || ""}
                            onChange={(e) => updateCartItemField(item.cartItemId, "notes", e.target.value)}
                          />
                          <div className="flex items-center justify-between mt-1">
                             <div className="flex gap-1 bg-white border border-gray-200 p-0.5 rounded-lg shadow-sm">
                               {["Starter", "Main", "Dessert"].map(crs => (
                                 <button
                                   key={crs}
                                   className={cn(
                                     "px-2 py-1 bg-transparent text-[10px] font-bold rounded-md transition-all",
                                     item.course === crs ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                                   )}
                                   onClick={() => updateCartItemField(item.cartItemId, "course", crs)}
                                 >
                                   {crs}
                                 </button>
                               ))}
                             </div>
                             <div className="flex items-center gap-1">
                                <button
                                  onClick={() => removeFromCart(item.cartItemId)}
                                  className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-rose-50 hover:border-rose-200 text-gray-400 hover:text-rose-500 shadow-sm transition-all"
                                >
                                  <Minus size={12} />
                                </button>
                                <button
                                  onClick={() => addToCart(item)}
                                  className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-green-50 hover:border-green-200 text-gray-400 hover:text-green-500 shadow-sm transition-all"
                                >
                                  <Plus size={12} />
                                </button>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                ))}

                <div className="h-px bg-gray-100 my-2" />

                {/* Room link toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Link to Room Bill</h4>
                    <p className="text-xs text-gray-400">Add to guest checkout</p>
                  </div>
                  <Switch checked={linkToRoom} onCheckedChange={setLinkToRoom} />
                </div>
                <AnimatePresence>
                  {linkToRoom && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="space-y-1 mt-1">
                        <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Selected Room</Label>
                        <select
                          value={selectedRoomId}
                          onChange={(e) => setSelectedRoomId(e.target.value as Id<"rooms">)}
                          className="w-full h-11 rounded-xl border-gray-100 bg-gray-50 text-sm font-bold px-3 focus:outline-none focus:ring-2 focus:ring-gray-900/10 appearance-none"
                        >
                          <option value="">Select occupied room...</option>
                          {occupiedRooms.map((r: any) => (
                            <option key={r._id} value={r._id}>
                              Room {r.roomNumber} — {r.guestName}
                            </option>
                          ))}
                        </select>
                        {!selectedRoomId && (
                           <p className="text-[10px] text-amber-600 font-bold px-1 mt-1">Please select a room to link the bill</p>
                        )}
                        {selectedRoomId && (
                          <div className="bg-emerald-50 text-emerald-700 p-2 rounded-lg mt-1 border border-emerald-100">
                             <p className="text-[10px] font-black uppercase tracking-tighter">Verified Guest</p>
                             <p className="text-xs font-bold leading-none">{occupiedRooms.find((r: any) => r._id === selectedRoomId)?.guestName}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Bar */}
              <div className="shrink-0 bg-gray-900 px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                      Sub ₹{subtotal.toLocaleString()} · GST ₹{(foodGST + bevGST).toFixed(0)}
                    </p>
                    <p className="text-2xl font-black text-white">₹{grandTotal.toLocaleString()}</p>
                  </div>
                  {/* Kitchen Slip — prints compact slip, no DB write */}
                  <Button
                    onClick={printKOTSlip}
                    variant="outline"
                    title="Print Kitchen Slip"
                    className="h-10 w-10 rounded-xl bg-amber-500/20 border-amber-400/30 text-amber-400 hover:bg-amber-400/30 hover:text-amber-300 transition-colors"
                  >
                    <ChefHat size={16} />
                    
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={isSubmitting}
                    onClick={handleDirectCheckout}
                    className="flex-1 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider"
                  >
                    {isSubmitting ? "…" : "Quick Bill"}
                  </Button>
                  <Button
                    disabled={isSubmitting}
                    onClick={handlePrintKOT}
                    className={cn("flex-1 h-11 rounded-xl text-white font-black text-xs uppercase tracking-wider", accentColorClass)}
                  >
                    {isSubmitting ? "…" : `KOT · ${activeTable}`}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
