"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, ArrowRight, Printer, Search, X } from "lucide-react";
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

type MenuItemType = Doc<"menuItems">;

interface POSProps {
  title: string;
  items: MenuItemType[];
  categories: string[];
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
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]);
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
    const matchesCategory = i.subCategory === activeCategory || i.category === activeCategory;
    const matchesSearch = search === "" ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.subCategory?.toLowerCase().includes(search.toLowerCase());
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
          category: c.category,
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
          category: c.category,
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
  const foodGST = currentCart.filter(i => i.category === "Food").reduce((a, o) => a + o.qty * o.price, 0) * 0.05;
  const bevGST = currentCart.filter(i => i.category === "Beverage").reduce((a, o) => a + o.qty * o.price, 0) * 0.18;
  const grandTotal = subtotal + foodGST + bevGST;

  return (
    /* Page wrapper: flex column, NO min-h-screen (causes iOS issues), clip overflow */
    <div className="flex flex-col bg-gray-50/50" style={{ minHeight: "100dvh", overflowX: "clip" }}>
      <DesktopTopbar title={title} outlet={outlet} />

      <div className="flex-1 flex flex-col w-full max-w-[1600px] mx-auto px-3 pt-3 pb-36 sm:px-6 sm:pt-5 lg:px-8">

        {/* ── Header ── */}
        <div className="mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">POS Terminal</p>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">{title} Orders</h1>
        </div>

        {/* ── Table Selector ── clipped scrolling row, never stretches page */}
        <div className="mb-4 -mx-3 px-3 sm:mx-0 sm:px-0">
          <div
            className="flex gap-1.5 overflow-x-auto bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            {TABLES.map(t => (
              <button
                key={t}
                onClick={() => setActiveTable(t)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap",
                  activeTable === t
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
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

        {/* ── Category Pills ── only shown when not searching */}
        {!search && (
          <div
            className="flex gap-1.5 mb-5 -mx-3 px-3 sm:mx-0 sm:px-0 overflow-x-auto"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={cn(
                  "shrink-0 px-4 py-2 rounded-full text-sm font-bold border transition-all",
                  activeCategory === c
                    ? "bg-white border-gray-900 text-gray-900 shadow-sm"
                    : "bg-transparent border-transparent text-gray-400 hover:text-gray-700"
                )}
              >
                {c}
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
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:shadow-gray-200/50 transition-all cursor-pointer relative overflow-hidden"
                onClick={() => addToCart(item)}
              >
                {/* Thumbnail */}
                {item.image ? (
                  <div className="h-28 w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : null}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center bg-gray-50 group-hover:bg-gray-900 transition-colors shrink-0")}>
                      <Plus className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors" />
                    </div>
                    <div className={`w-2 h-2 rounded-full mt-1 ${item.category === "Food" ? "bg-rose-500" : "bg-emerald-500"}`} />
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm leading-tight mb-0.5 group-hover:text-indigo-600 transition-colors line-clamp-2">{item.name}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">{item.subCategory}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-gray-900 tabular-nums">₹{item.price}</span>
                    {currentCart.find(i => i._id === item._id) && (
                      <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">
                        {currentCart.find(i => i._id === item._id)?.qty}×
                      </span>
                    )}
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
              {search ? `No items match "${search}"` : `No items in ${activeCategory}`}
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
