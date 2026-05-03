"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { DesktopTopbar } from "@/components/Topbar";
import {
  Users, Search, Phone, Calendar,
  CreditCard, ChevronRight, TrendingUp, Star,
  PhoneCall, Mail, X, ArrowLeft, Banknote,
  ShoppingBag, Building2, Bed, Receipt,
  SlidersHorizontal, ChevronUp, Pencil, Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// ─── Utility ─────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function inr(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function tierInfo(visits: number, spend: number) {
  if (spend >= 100000 || visits >= 10)
    return { label: "Platinum", color: "from-slate-300 to-slate-500", text: "text-slate-600", dot: "bg-slate-400" };
  if (spend >= 50000 || visits >= 5)
    return { label: "Gold", color: "from-amber-300 to-amber-500", text: "text-amber-700", dot: "bg-amber-400" };
  if (visits >= 3)
    return { label: "Silver", color: "from-zinc-300 to-zinc-400", text: "text-zinc-600", dot: "bg-zinc-400" };
  return { label: "New", color: "from-emerald-300 to-emerald-500", text: "text-emerald-700", dot: "bg-emerald-400" };
}

function statusStyle(s: string) {
  switch (s?.toLowerCase()) {
    case "confirmed":
    case "completed":
    case "paid":
    case "checked_out": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "checked_in":  return "bg-blue-50 text-blue-700 border-blue-200";
    case "cancelled":   return "bg-red-50 text-red-600 border-red-200";
    case "pending":     return "bg-amber-50 text-amber-700 border-amber-200";
    default:            return "bg-zinc-50 text-zinc-600 border-zinc-200";
  }
}

// ─── Avatar ───────────────────────────────────────────────────────

function Avatar({ name, size = "md", className = "" }: { name: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const sizes = { sm: "w-8 h-8 text-[10px]", md: "w-10 h-10 text-xs", lg: "w-14 h-14 text-sm", xl: "w-20 h-20 text-xl" };
  const hues = [
    "from-rose-400 to-pink-600",
    "from-violet-400 to-purple-600",
    "from-sky-400 to-blue-600",
    "from-teal-400 to-emerald-600",
    "from-orange-400 to-amber-600",
    "from-indigo-400 to-violet-600",
  ];
  const hue = hues[name.charCodeAt(0) % hues.length];
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${hue} flex items-center justify-center font-bold text-white shrink-0 shadow-sm ${sizes[size]} ${className}`}>
      {initials(name)}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, shortLabel, value, accent }: { icon: any; label: string; shortLabel?: string; value: string | number; accent: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-card ${accent}`}>
      {/* Mobile layout: compact */}
      <div className="sm:hidden p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-background/70 flex items-center justify-center shrink-0">
            <Icon size={12} className="text-foreground/60" />
          </div>
          <p className="text-[9px] font-bold uppercase tracking-[0.10em] text-muted-foreground leading-tight line-clamp-2">
            {shortLabel ?? label}
          </p>
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
      {/* Desktop layout: spacious */}
      <div className="hidden sm:block p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <div className="w-8 h-8 rounded-xl bg-background/60 flex items-center justify-center">
            <Icon size={15} className="text-foreground/60" />
          </div>
        </div>
        <p className="text-3xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

// ─── Guest row (desktop) ──────────────────────────────────────────

function GuestRow({ guest, onClick }: { guest: any; onClick: () => void }) {
  const tier = tierInfo(guest.totalVisits, guest.totalSpend);
  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
      className="group cursor-pointer border-b border-border/50 hover:bg-muted/40 transition-colors"
    >
      <td className="py-3.5 pl-5 pr-3">
        <div className="flex items-center gap-3">
          <Avatar name={guest.name} size="md" />
          <div>
            <p className="font-semibold text-foreground text-sm leading-tight">{guest.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{guest.phone}</p>
          </div>
        </div>
      </td>
      <td className="py-3.5 px-3">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${tier.text} bg-gradient-to-r ${tier.color} bg-opacity-10`}>
          <span className={`w-1.5 h-1.5 rounded-full ${tier.dot}`} />
          {tier.label}
        </div>
      </td>
      <td className="py-3.5 px-3">
        <span className="text-sm font-medium text-foreground tabular-nums">
          {guest.totalVisits} <span className="text-muted-foreground text-xs">{guest.totalVisits === 1 ? "visit" : "visits"}</span>
        </span>
      </td>
      <td className="py-3.5 px-3">
        <span className="text-sm font-bold text-foreground tabular-nums">{inr(guest.totalSpend)}</span>
      </td>
      <td className="py-3.5 px-3">
        {guest.idType ? (
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{guest.idType}</span>
            <span className="text-xs font-mono text-foreground/80">{guest.idNumber}</span>
          </div>
        ) : (
          <span className="text-xs italic text-muted-foreground/60">—</span>
        )}
      </td>
      <td className="py-3.5 pl-3 pr-5 text-right">
        <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full">
          Ledger <ChevronRight size={12} />
        </button>
      </td>
    </motion.tr>
  );
}

// ─── Guest card (mobile) ──────────────────────────────────────────

function GuestCard({ guest, onClick }: { guest: any; onClick: () => void }) {
  const tier = tierInfo(guest.totalVisits, guest.totalSpend);
  // Abbreviate large spend amounts for mobile
  const shortSpend = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000)  return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000)    return `₹${(n / 1000).toFixed(0)}K`;
    return `₹${n}`;
  };
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-3.5 rounded-2xl border bg-card active:scale-[0.98] transition-transform cursor-pointer shadow-sm"
    >
      <Avatar name={guest.name} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className="font-semibold text-foreground text-sm truncate">{guest.name}</p>
          <span className="font-bold text-sm text-foreground tabular-nums shrink-0">{shortSpend(guest.totalSpend)}</span>
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className="text-[11px] text-muted-foreground font-mono truncate">{guest.phone}</p>
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ${tier.text}`}>
            <span className={`w-1 h-1 rounded-full ${tier.dot}`} />
            {tier.label} · {guest.totalVisits}v
          </div>
        </div>
      </div>
      <ChevronRight size={13} className="text-muted-foreground shrink-0" />
    </motion.div>
  );
}

// ─── Ledger sheet (full screen on mobile, side panel on desktop) ──

function LedgerSheet({ guest, onClose }: { guest: any; onClose: () => void }) {
  const history = useQuery(api.guests.getHistory, { phone: guest.phone, name: guest.name });
  const tier = tierInfo(guest.totalVisits, guest.totalSpend);
  const avgTicket = guest.totalVisits > 0 ? Math.round(guest.totalSpend / guest.totalVisits) : 0;

  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingGuest, setEditingGuest] = useState(false);
  
  const deleteRoomBooking = useMutation(api.bookings.deleteBooking);
  const deleteBanquetBooking = useMutation(api.banquet.deleteBanquetBooking);
  const deleteBill = useMutation(api.billing.deleteBill);

  const handleDelete = async (item: any, type: "room" | "banquet" | "bill") => {
    if (!window.confirm("Are you sure you want to delete this entry? This action cannot be undone.")) return;
    
    try {
      if (type === "room") await deleteRoomBooking({ bookingId: item._id });
      else if (type === "banquet") await deleteBanquetBooking({ bookingId: item._id });
      else if (type === "bill") await deleteBill({ billId: item._id });
      toast.success("Entry deleted successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete entry");
    }
  };

  return (
    <>
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="fixed inset-0 sm:inset-auto sm:right-0 sm:top-0 sm:bottom-0 sm:w-[520px] md:w-[580px] bg-background z-50 flex flex-col shadow-2xl border-l border-border"
    >
      {/* Header */}
      <div className="shrink-0 bg-muted/20 border-b border-border">
        {/* Mobile back bar */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2 sm:hidden">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-muted-foreground">Guest Profile</span>
        </div>

        <div className="p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <Avatar name={guest.name} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{guest.name}</h2>
                    <button 
                      onClick={() => setEditingGuest(true)}
                      className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  <div className={`mt-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${tier.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${tier.dot}`} />
                    {tier.label} Member
                  </div>
                </div>
                {/* Desktop close */}
                <button
                  onClick={onClose}
                  className="hidden sm:flex w-8 h-8 rounded-full bg-muted hover:bg-muted/80 items-center justify-center transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <a href={`tel:${guest.phone}`} className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-background border rounded-full px-3 py-1 text-foreground hover:bg-muted transition-colors">
                  <Phone size={11} className="text-primary" /> {guest.phone}
                </a>
                {guest.idType && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-background border rounded-full px-3 py-1 text-foreground">
                    <CreditCard size={11} className="text-primary" />
                    <span className="uppercase">{guest.idType}</span>: {guest.idNumber}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5">
            {[
              { label: "Visits", value: guest.totalVisits },
              { label: "Avg Ticket", value: inr(avgTicket) },
              { label: "Total LTV", value: inr(guest.totalSpend), highlight: true },
            ].map(({ label, value, highlight }) => (
              <div key={label} className={`rounded-xl p-3 border text-center ${highlight ? "bg-primary/5 border-primary/20" : "bg-background border-border/50"}`}>
                <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground font-bold mb-1">{label}</p>
                <p className={`text-base sm:text-lg font-bold leading-none ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bookings" className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 border-b bg-muted/10 px-5 sm:px-7">
          <TabsList className="bg-transparent h-11 gap-4 sm:gap-6 p-0 w-full justify-start rounded-none">
            {[
              { value: "bookings", label: "Rooms", icon: Bed },
              { value: "banquets", label: "Banquets", icon: Building2 },
              { value: "bills",    label: "F&B",     icon: ShoppingBag },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="bg-transparent p-0 h-full border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none font-bold text-[10px] uppercase tracking-[0.1em] flex items-center gap-1.5 text-muted-foreground"
              >
                <Icon size={12} /> {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-6 space-y-3">
            <TabsContent value="bookings" className="mt-0 outline-none space-y-3">
              {history === undefined ? (
                <LoadingSkeleton />
              ) : history.roomBookings.length === 0 ? (
                <LedgerEmpty label="No room bookings" icon={Bed} />
              ) : (
                history.roomBookings.map((b: any) => (
                  <LedgerCard
                    key={b._id}
                    icon={Bed}
                    title={b.folioNumber ? `Folio ${b.folioNumber}` : "Room Booking"}
                    subtitle={`Check-in: ${b.checkIn}`}
                    meta={`Check-out: ${b.checkOut}`}
                    amount={b.totalAmount}
                    status={b.status}
                    extras={[
                      b.advance > 0 && { label: "Advance", value: inr(b.advance) },
                      b.balance > 0 && { label: "Balance", value: inr(b.balance), warn: true },
                    ].filter(Boolean) as any}
                    onEdit={() => setEditingItem({ item: b, type: "room" })}
                    onDelete={() => handleDelete(b, "room")}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="banquets" className="mt-0 outline-none space-y-3">
              {history === undefined ? (
                <LoadingSkeleton />
              ) : history.banquetBookings.length === 0 ? (
                <LedgerEmpty label="No banquet history" icon={Building2} />
              ) : (
                history.banquetBookings.map((b: any) => (
                  <LedgerCard
                    key={b._id}
                    icon={Building2}
                    title={b.eventName}
                    subtitle={b.eventType}
                    meta={`Event: ${b.eventDate}${b.timeSlot ? " · " + b.timeSlot : ""}`}
                    amount={b.totalAmount}
                    status={b.status}
                    extras={[
                      b.guestCount && { label: "Guests", value: `${b.guestCount} pax` },
                      b.advance > 0 && { label: "Advance", value: inr(b.advance) },
                      b.balance > 0 && { label: "Balance due", value: inr(b.balance), warn: true },
                    ].filter(Boolean) as any}
                    onEdit={() => setEditingItem({ item: b, type: "banquet" })}
                    onDelete={() => handleDelete(b, "banquet")}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="bills" className="mt-0 outline-none space-y-3">
              {history === undefined ? (
                <LoadingSkeleton />
              ) : history.bills.length === 0 ? (
                <LedgerEmpty label="No F&B bills" icon={ShoppingBag} />
              ) : (
                history.bills.map((b: any) => (
                  <LedgerCard
                    key={b._id}
                    icon={Receipt}
                    title={`${b.billType.charAt(0).toUpperCase() + b.billType.slice(1)} Bill`}
                    subtitle={b.paymentMethod ? `Paid via ${b.paymentMethod}` : "Payment details unavailable"}
                    meta={b.createdAt?.slice(0, 10) ?? ""}
                    amount={b.totalAmount}
                    status={b.status}
                    extras={[
                      b.discountAmount > 0 && { label: "Discount", value: `-${inr(b.discountAmount)}` },
                      b.cgst > 0 && { label: "GST", value: inr(b.cgst + b.sgst) },
                    ].filter(Boolean) as any}
                    onEdit={() => setEditingItem({ item: b, type: "bill" })}
                    onDelete={() => handleDelete(b, "bill")}
                  />
                ))
              )}
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>

      {/* Footer actions */}
      <div className="shrink-0 p-4 sm:p-5 border-t bg-muted/10 grid grid-cols-2 gap-3">
        <a
          href={`tel:${guest.phone}`}
          className="flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all"
        >
          <PhoneCall size={16} /> Call Guest
        </a>
        <button className="flex items-center justify-center gap-2 h-11 rounded-xl border bg-background font-semibold text-sm hover:bg-muted active:scale-95 transition-all">
          <Mail size={16} /> Send Invoice
        </button>
      </div>

      <EditLedgerModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem?.item}
        type={editingItem?.type}
      />

      <EditGuestModal
        isOpen={editingGuest}
        onClose={() => setEditingGuest(false)}
        guest={guest}
      />
    </motion.div>
    </>
  );
}

// ─── Edit Guest Modal ─────────────────────────────────────────────

function EditGuestModal({ isOpen, onClose, guest }: { isOpen: boolean; onClose: () => void; guest: any }) {
  const [formData, setFormData] = useState<any>({ ...guest });
  const updateGuest = useMutation(api.guests.updateGuest);

  const [lastGuestId, setLastGuestId] = useState<string | null>(null);
  if (guest?._id !== lastGuestId) {
    setFormData({ ...guest });
    setLastGuestId(guest?._id || null);
  }

  const handleSave = async () => {
    try {
      await updateGuest({
        guestId: guest._id,
        name: formData.name,
        phone: formData.phone,
        idType: formData.idType,
        idNumber: formData.idNumber,
        notes: formData.notes,
      });
      toast.success("Profile updated successfully");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Guest Profile</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Full Name</Label>
            <Input value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Phone Number</Label>
            <Input value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>ID Type</Label>
              <Select value={formData.idType} onValueChange={(v) => setFormData({ ...formData, idType: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ID" />
                </SelectTrigger>
                <SelectContent>
                  {["Aadhar", "PAN", "Voter ID", "Driving License", "Passport"].map((id) => (
                    <SelectItem key={id} value={id.toLowerCase().replace(" ", "_")}>{id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>ID Number</Label>
              <Input value={formData.idNumber || ""} onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Input value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Ledger card ──────────────────────────────────────────────────

function LedgerCard({
  icon: Icon, title, subtitle, meta, amount, status, extras = [], onEdit, onDelete,
}: {
  icon: any; title: string; subtitle: string; meta: string;
  amount: number; status: string;
  extras?: { label: string; value: string; warn?: boolean }[];
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
      <div className="flex items-start">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 text-left p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
            <Icon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-sm text-foreground leading-tight truncate">{title}</p>
              <p className="font-bold text-sm text-foreground tabular-nums shrink-0">{inr(amount)}</p>
            </div>
            <div className="flex items-center justify-between gap-2 mt-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{meta}</p>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusStyle(status)}`}>
                {status.replace(/_/g, " ")}
              </span>
            </div>
          </div>
          {extras.length > 0 && (
            <ChevronUp size={14} className={`text-muted-foreground shrink-0 mt-1 transition-transform ${expanded ? "" : "rotate-180"}`} />
          )}
        </button>
        
        {/* Edit/Delete Actions */}
        <div className="flex flex-col border-l border-border/50">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
            className="p-3 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            className="p-3 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors border-t border-border/50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && extras.length > 0 && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 flex flex-wrap gap-2 border-t border-border/50 mt-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold w-full mb-1">{subtitle}</p>
              {extras.map((e) => (
                <div key={e.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${e.warn ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-muted/50 border-border text-foreground"}`}>
                  <span className="text-[10px] text-muted-foreground">{e.label}:</span> {e.value}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Edit Ledger Modal ────────────────────────────────────────────

function EditLedgerModal({ isOpen, onClose, item, type }: { isOpen: boolean; onClose: () => void; item: any; type: "room" | "banquet" | "bill" }) {
  const [formData, setFormData] = useState<any>({});
  const updateRoomBooking = useMutation(api.bookings.updateBooking);
  const updateBanquetBooking = useMutation(api.banquet.updateBanquetBooking);
  const updateBill = useMutation(api.billing.updateBill);

  const [lastItemId, setLastItemId] = useState<string | null>(null);
  const currentId = item?._id || null;

  if (currentId !== lastItemId) {
    setFormData(item ? { ...item } : {});
    setLastItemId(currentId);
  }

  const handleSave = async () => {
    try {
      if (type === "room") {
        await updateRoomBooking({
          bookingId: item._id,
          guestName: formData.guestName,
          guestPhone: formData.guestPhone,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          tariff: Number(formData.tariff),
          advance: Number(formData.advance),
          totalAmount: Number(formData.totalAmount),
          status: formData.status,
          notes: formData.notes,
        });
      } else if (type === "banquet") {
        await updateBanquetBooking({
          bookingId: item._id,
          eventName: formData.eventName,
          eventType: formData.eventType,
          eventDate: formData.eventDate,
          timeSlot: formData.timeSlot,
          guestName: formData.guestName,
          guestPhone: formData.guestPhone,
          guestCount: Number(formData.guestCount),
          totalAmount: Number(formData.totalAmount),
          advance: Number(formData.advance),
          notes: formData.notes,
        });
      } else if (type === "bill") {
        await updateBill({
          billId: item._id,
          guestName: formData.guestName,
          subtotal: Number(formData.subtotal),
          cgst: Number(formData.cgst),
          sgst: Number(formData.sgst),
          totalAmount: Number(formData.totalAmount),
          status: formData.status,
          paymentMethod: formData.paymentMethod,
          createdAt: formData.createdAt,
        });
      }
      toast.success("Updated successfully");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update");
    }
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Ledger Entry</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-auto px-1">
          {type === "room" && (
            <>
              <div className="grid gap-2">
                <Label>Guest Name</Label>
                <Input value={formData.guestName || ""} onChange={(e) => setFormData({ ...formData, guestName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Check-in</Label>
                  <Input type="date" value={formData.checkIn || ""} onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Check-out</Label>
                  <Input type="date" value={formData.checkOut || ""} onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Tariff</Label>
                  <Input type="number" value={formData.tariff || 0} onChange={(e) => setFormData({ ...formData, tariff: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Total Amount</Label>
                  <Input type="number" value={formData.totalAmount || 0} onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["confirmed", "checked_in", "checked_out", "cancelled", "pending"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {type === "banquet" && (
            <>
              <div className="grid gap-2">
                <Label>Event Name</Label>
                <Input value={formData.eventName || ""} onChange={(e) => setFormData({ ...formData, eventName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Date</Label>
                  <Input type="date" value={formData.eventDate || ""} onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Time Slot</Label>
                  <Select value={formData.timeSlot} onValueChange={(v) => setFormData({ ...formData, timeSlot: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["morning", "evening", "full_day"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Guests</Label>
                  <Input type="number" value={formData.guestCount || 0} onChange={(e) => setFormData({ ...formData, guestCount: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Total Amount</Label>
                  <Input type="number" value={formData.totalAmount || 0} onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })} />
                </div>
              </div>
            </>
          )}

          {type === "bill" && (
            <>
              <div className="grid gap-2">
                <Label>Bill Type</Label>
                <Input value={formData.billType || ""} disabled />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Subtotal</Label>
                  <Input type="number" value={formData.subtotal || 0} onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Total Amount</Label>
                  <Input type="number" value={formData.totalAmount || 0} onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>CGST</Label>
                  <Input type="number" value={formData.cgst || 0} onChange={(e) => setFormData({ ...formData, cgst: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>SGST</Label>
                  <Input type="number" value={formData.sgst || 0} onChange={(e) => setFormData({ ...formData, sgst: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Date</Label>
                <Input type="date" value={formData.createdAt || ""} onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["paid", "pending", "generated", "due"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border bg-card p-4 animate-pulse">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-muted rounded-full w-2/3" />
              <div className="h-2.5 bg-muted rounded-full w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Ledger empty ─────────────────────────────────────────────────

function LedgerEmpty({ label, icon: Icon }: { label: string; icon: any }) {
  return (
    <div className="py-14 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-2xl bg-muted/10">
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3 text-muted-foreground">
        <Icon size={20} />
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────

export default function CustomersPage() {
  const guests = useQuery(api.guests.list) || [];
  const [search, setSearch] = useState("");
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "spend" | "visits">("spend");

  const selectedGuest = guests.find((g: any) => g._id === selectedGuestId);

  const filtered = guests
    .filter(
      (g) =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.phone.includes(search)
    )
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "visits") return b.totalVisits - a.totalVisits;
      return b.totalSpend - a.totalSpend;
    });

  const loyalCount = guests.filter((g) => g.totalVisits >= 3).length;
  const topSpenders = guests.filter((g) => g.totalSpend >= 50000).length;

  return (
    <div className="flex flex-col h-full bg-background">
      <DesktopTopbar title="Customer Directory" />

      <main className="flex-1 overflow-hidden flex flex-col">
        {/* ── Stats row ── */}
        <div className="px-3 sm:px-6 pt-4 sm:pt-6 pb-3 grid grid-cols-3 gap-2 sm:gap-3">
          <StatCard icon={Users}      label="Total Guests"     shortLabel="Guests" value={guests.length} accent="border-border/60" />
          <StatCard icon={TrendingUp} label="Loyal (3+ visits)" shortLabel="Loyal"  value={loyalCount}   accent="border-emerald-200/60" />
          <StatCard icon={Star}       label="Top Spenders"     shortLabel="Top ₹"  value={topSpenders}  accent="border-amber-200/60" />
        </div>

        {/* ── Search + sort bar ── */}
        <div className="px-3 sm:px-6 pb-3 flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name or phone…"
              className="pl-9 h-10 bg-card text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            {(["spend", "visits", "name"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`h-10 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-colors border ${
                  sortBy === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {s === "spend" ? "₹" : s === "visits" ? "#" : "A-Z"}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-hidden px-3 sm:px-6 pb-4 sm:pb-6">

          {/* Desktop table */}
          <div className="hidden sm:flex flex-col h-full rounded-2xl border bg-card overflow-hidden shadow-sm">
            <div className="overflow-auto flex-1">
              <table className="w-full">
                <thead className="sticky top-0 bg-muted/60 backdrop-blur z-10 border-b border-border">
                  <tr>
                    {["Guest", "Tier", "Visits", "Revenue", "Identity", ""].map((h) => (
                      <th key={h} className="py-3 px-4 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground first:pl-5 last:pr-5 last:text-right">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filtered.map((guest) => (
                      <GuestRow key={guest._id} guest={guest} onClick={() => setSelectedGuestId(guest._id)} />
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>

              {filtered.length === 0 && <EmptySearch search={search} onClear={() => setSearch("")} />}
            </div>
          </div>

          {/* Mobile card list */}
          <ScrollArea className="sm:hidden h-full">
            <div className="space-y-2 pb-24 px-0.5">
              <AnimatePresence>
                {filtered.map((guest) => (
                  <GuestCard key={guest._id} guest={guest} onClick={() => setSelectedGuestId(guest._id)} />
                ))}
              </AnimatePresence>
              {filtered.length === 0 && <EmptySearch search={search} onClear={() => setSearch("")} />}
            </div>
          </ScrollArea>
        </div>
      </main>

      {/* ── Ledger panel ── */}
      <AnimatePresence>
        {selectedGuest && (
          <>
            {/* Backdrop (mobile only) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGuestId(null)}
              className="fixed inset-0 bg-black/30 z-40 sm:hidden"
            />
            <LedgerSheet guest={selectedGuest} onClose={() => setSelectedGuestId(null)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Empty search state ───────────────────────────────────────────

function EmptySearch({ search, onClear }: { search: string; onClear: () => void }) {
  return (
    <div className="py-20 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4 text-muted-foreground">
        <Users size={28} />
      </div>
      <p className="font-bold text-foreground mb-1">
        {search ? "No results found" : "No guests yet"}
      </p>
      <p className="text-sm text-muted-foreground max-w-xs">
        {search
          ? `Nothing matched "${search}". Try a different name or phone.`
          : "Guests appear here after their first booking or order."}
      </p>
      {search && (
        <button onClick={onClear} className="mt-4 text-sm text-primary font-semibold hover:underline">
          Clear search
        </button>
      )}
    </div>
  );
}