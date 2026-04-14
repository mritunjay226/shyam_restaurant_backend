"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, ArrowRight, Printer, Search, X, UtensilsCrossed, Receipt } from "lucide-react";
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

type MenuItemType = Doc<"banquetMenuItems"> & { category?: string };

// ── Bill Preview State Type ──
type BillPreviewState = {
  tableNo: string;
  subtotal: number;
  isGstBill: boolean;
  gstin: string;
  paymentMethod: string;
  discount: string;
};

// ── Individual Table Bill Card ──
function TableBillCard({
  outlet,
  tableNo,
  orders,
  generateTableBill,
}: {
  outlet: string;
  tableNo: string;
  orders: any[];
  generateTableBill: any;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGstBill, setIsGstBill] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState("");
  const [gstin, setGstin] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

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
      await generateTableBill({
        outlet,
        tableNumber: tableNo,
        paymentMethod,
        isGstBill,
        ...(gstin.trim() && { gstin: gstin.trim() }),
        ...(discountAmt > 0 && { discountAmount: discountAmt }),
      });
      toast.success(`✅ Bill generated for ${tableNo} · ₹${grandTotal.toLocaleString()}`);
      setIsExpanded(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate bill");
    } finally {
      setIsGenerating(false);
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
        <div>
          <h3 className="font-bold text-gray-900">{tableNo}</h3>
          <p className="text-[10px] text-gray-400 font-bold tracking-widest">{orders.length} ACTIVE KOT(S)</p>
        </div>
        <div className="text-right">
          <p className="font-black text-gray-900">₹{subtotal.toLocaleString()}</p>
          <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md text-[9px] font-bold uppercase">Unbilled</span>
        </div>
      </div>

      {/* KOT Summary Pills */}
      <div className="px-4 py-2 space-y-1.5">
        {orders.map((o: any) => (
          <div key={o._id} className="flex justify-between items-center text-xs text-gray-500 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100">
            <span className="font-semibold">{o.kotNumber}</span>
            <span>₹{o.subtotal?.toLocaleString()}</span>
          </div>
        ))}
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
            <div>
              <Label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">GSTIN (Optional)</Label>
              <Input
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="e.g. 07AABCU9603R1ZV"
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
        <div className="px-4 pb-4">
          <Button
            onClick={() => setIsExpanded(true)}
            className="w-full bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-100 transition-colors font-bold h-9 rounded-xl text-xs uppercase mt-2"
          >
            Generate Bill
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Local Active Orders Component ──
function ActiveOrdersList({ outlet }: { outlet: string }) {
  const activeOrders = useQuery(api.orders.getActiveOrdersByOutlet, { outlet });
  const generateTableBill = useMutation(api.billing.generateTableBill);

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
        />
      ))}
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

const TABLES = [...Array.from({ length: 8 }).map((_, i) => `T${i + 1}`), "Walk-in", "Takeaway", "Delivery"];

export function POSMenu({ title, items, categories, accentColorClass, accentBorderClass, accentTextClass, outlet }: POSProps) {
  const [activeTable, setActiveTable] = useState("T1");
  const [activeCategory, setActiveCategory] = useState<string | undefined>();
  const effectiveCategory = activeCategory || categories[0]?._id;
  const [carts, setCarts] = useState<Record<string, CartItem[]>>({});
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false);
  const [linkToRoom, setLinkToRoom] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const createOrder = useMutation(api.orders.createOrder);
  const directCheckout = useMutation(api.billing.directCheckoutOrder);
  const allRooms = useQuery(api.rooms.getAllRooms) || [];

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
      if (linkToRoom && roomNumber) {
        const foundRoom = allRooms.find(r => r.roomNumber === roomNumber);
        if (!foundRoom) { toast.error(`Room ${roomNumber} not found.`); setIsSubmitting(false); return; }
        roomIdToLink = foundRoom._id;
      }
      await createOrder({
        outlet,
        tableNumber: activeTable,
        roomId: roomIdToLink,
        items: currentCart.map(c => ({ 
          menuItemId: c._id, 
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
          menuItemId: c._id, 
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
        </div>

        {/* ── Table Selector ── */}
        <div className="mb-4">
          <div
            className="flex flex-nowrap gap-1.5 overflow-x-auto pb-2 custom-scrollbar scrollbar-hide sm:scrollbar-default scroll-smooth w-full"
          >
            {TABLES.map(t => (
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
                  "px-4 py-2 rounded-full text-xs sm:text-sm font-bold border transition-all whitespace-nowrap shrink-0",
                  activeTable === t
                    ? "bg-gray-900 border-gray-900 text-white shadow-md shadow-gray-200"
                    : "bg-white border-gray-100 text-gray-500 hover:text-gray-900 hover:border-gray-300"
                )}
              >
                {t.startsWith("T") && t.length === 2 ? `Table ${t.slice(1)}` : t}
              </button>
            ))}
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
                      <Input
                        value={roomNumber}
                        onChange={e => setRoomNumber(e.target.value)}
                        placeholder="Room number e.g. 101"
                        className="h-11 rounded-xl border-gray-100 bg-gray-50 text-base font-bold"
                      />
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
                  <Button
                    disabled={isSubmitting}
                    onClick={handlePrintKOT}
                    variant="outline"
                    className="h-10 w-10 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/15"
                  >
                    <Printer size={16} />
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
                    {isSubmitting ? "…" : "KOT"}
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
