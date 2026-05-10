"use client";

import { useState, useEffect, useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { RoomViewData } from "@/components/RoomCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar as CalendarIcon,
  User,
  UserCheck,
  ShieldCheck,
  Droplets,
  Plus,
  Phone,
  CreditCard,
  BedDouble,
  StickyNote,
  Hash,
  IndianRupee,
  Clock,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DatePicker } from "./ui/date-picker";
import { parseISO, startOfDay, eachDayOfInterval } from "date-fns";

interface BookingSheetProps {
  room: RoomViewData | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusColor: Record<string, string> = {
  available: "bg-emerald-500",
  occupied: "bg-rose-500",
  pending_checkout: "bg-amber-500",
  dirty: "bg-orange-500",
};

const statusBadge: Record<string, string> = {
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  checked_in: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  checked_out: "bg-gray-50 text-gray-600 border-gray-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

function DetailRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 text-gray-400 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-0.5">
          {label}
        </p>
        <p
          className={cn(
            "text-sm font-semibold truncate",
            highlight ? "text-emerald-700 text-base" : "text-gray-900"
          )}
        >
          {value || <span className="text-gray-300 font-normal italic">—</span>}
        </p>
      </div>
    </div>
  );
}

export function BookingSheet({ room, isOpen, onClose }: BookingSheetProps) {
  const [advance, setAdvance] = useState("0");
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [idType, setIdType] = useState("Aadhar");
  const [idNumber, setIdNumber] = useState("");
  const [checkIn, setCheckIn] = useState(format(new Date(), "yyyy-MM-dd"));
  const [checkOut, setCheckOut] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFutureBookingMode, setIsFutureBookingMode] = useState(false);
  const [isEditingStay, setIsEditingStay] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<{
    roomId: any;
    roomNumber: string;
    tariff: string;
    extraBed: boolean;
    plan: string;
  }[]>([]);
  const router = useRouter();

  const createMultiRoomBooking = useMutation(api.bookings.createMultiRoomBooking);
  const allRooms = useQuery(api.rooms.getAllRooms, {}) || [];
  const availableRooms = useMemo(() => 
    allRooms.filter((r: any) => 
      r.status === "available" && 
      !selectedRooms.find(sr => sr.roomId === r._id)
    ), [allRooms, selectedRooms]);

  const createBooking = useMutation(api.bookings.createBooking);
  const checkoutMutation = useMutation(api.bookings.checkOut);
  const updateRoomStatus = useMutation(api.rooms.updateRoomStatus);
  const updateBooking = useMutation(api.bookings.updateBooking);

  // All bookings for this room
  const roomBookings = useQuery(
    api.bookings.getBookingsByRoom,
    room?._id ? { roomId: room._id as any } : "skip"
  ) || [];

  // Active booking (checked_in or confirmed with today's check-in)
  const activeBooking = useMemo(() => {
    if (!roomBookings.length) return null;
    const today = format(new Date(), "yyyy-MM-dd");
    // Priority: checked_in > confirmed arriving today or earlier
    return (
      roomBookings.find((b) => b.status === "checked_in") ||
      roomBookings.find(
        (b) => b.status === "confirmed" && b.checkIn <= today
      ) ||
      null
    );
  }, [roomBookings]);

  const disabledDates = useMemo(() => {
    const dates: any[] = [];
    const now = Date.now();
    const thirtyMinsAgo = now - 30 * 60 * 1000;
    const todayStr = format(new Date(), "yyyy-MM-dd");

    roomBookings.forEach((b) => {
      // Cancelled / checked-out: those dates are always free
      if (b.status === "cancelled" || b.status === "checked_out") return;

      // Expired pending holds
      if (b.status === "pending" && b._creationTime < thirtyMinsAgo) return;

      if (b.status === "checked_in") {
        // Active guest — block the entire stay range
      } else if (b.status === "confirmed" && b.checkIn > todayStr) {
        // Future confirmed reservation — block those upcoming dates
      } else {
        // Confirmed with checkIn = today or earlier (no-show / banquet block):
        // treat as stale and don't block the calendar
        return;
      }

      try {
        const start = parseISO(b.checkIn);
        const end = parseISO(b.checkOut);
        const days = eachDayOfInterval({ start, end });
        days.pop(); // check-out day is free for new arrivals
        dates.push(...days);
      } catch (e) {}
    });
    return dates;
  }, [roomBookings]);




  useEffect(() => {
    if (room) {
      setSelectedRooms([{
        roomId: room._id,
        roomNumber: room.roomNumber,
        tariff: room.tariff?.toString() || "0",
        extraBed: false,
        plan: "EP"
      }]);
      setAdvance("0");
      setGuestName("");
      setPhone("");
      setIdNumber("");
      setCheckOut("");
      setNotes("");
      setIsFutureBookingMode(false);
      setIsEditingStay(false);
    }
  }, [room]);

  useEffect(() => {
    if (isEditingStay && activeBooking) {
      setGuestName(activeBooking.guestName || "");
      const fullPhone = activeBooking.guestPhone || "";
      let cCode = "+91";
      let pNum = fullPhone;
      if (fullPhone.startsWith("+")) {
        const match = fullPhone.match(/^(\+\d{1,3})(.*)$/);
        if (match) {
          cCode = match[1];
          pNum = match[2];
        }
      }
      setCountryCode(cCode);
      setPhone(pNum);
      setIdType(activeBooking.idType || "Aadhar");
      setIdNumber(activeBooking.idNumber || "");
      setCheckOut(activeBooking.checkOut || "");
      setSelectedRooms([{
        roomId: room?._id,
        roomNumber: room?.roomNumber || "",
        tariff: activeBooking.tariff?.toString() || "0",
        extraBed: activeBooking.extraBed || false,
        plan: activeBooking.plan || "EP"
      }]);
      setAdvance(activeBooking.advance?.toString() || "0");
      setNotes(activeBooking.notes || "");
    }
  }, [isEditingStay, activeBooking, room]);

  const onPointerDown = (e: React.PointerEvent) => e.stopPropagation();

  const handleConfirm = async () => {
    if (!guestName || !phone || !checkOut || selectedRooms.length === 0)
      return alert("Please fill all required fields");
    setIsSubmitting(true);
    try {
      await createMultiRoomBooking({
        rooms: selectedRooms.map(r => ({
          roomId: r.roomId,
          tariff: parseInt(r.tariff),
          extraBed: r.extraBed,
          plan: r.plan,
        })),
        guestName,
        guestPhone: `${countryCode}${phone}`,
        idType,
        idNumber,
        checkIn,
        checkOut,
        advance: parseInt(advance || "0"),
        notes,
      });
      onClose();
    } catch (e) {
      console.error(e);
      alert("Error creating booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckOut = () => {
    router.push("/billing");
    onClose();
  };

  const handleUpdateStay = async () => {
    if (!guestName || !phone || !checkOut || selectedRooms.length === 0)
      return alert("Please fill all required fields");
    if (!activeBooking) return;
    setIsSubmitting(true);
    try {
      const sr = selectedRooms[0];
      const newComputedDays = Math.max(1, differenceInDays(new Date(checkOut), new Date(activeBooking.checkIn)));
      const totalAmt = (parseInt(sr.tariff || "0") + (sr.extraBed ? 500 : 0)) * newComputedDays;
      
      let finalPhone = phone;
      if (!phone.startsWith("+") && countryCode) {
        finalPhone = `${countryCode}${phone}`;
      } else if (phone.startsWith("+")) {
        finalPhone = phone;
      }

      await updateBooking({
        bookingId: activeBooking._id as Id<"bookings">,
        guestName,
        guestPhone: finalPhone,
        idType,
        idNumber,
        checkOut,
        tariff: parseInt(sr.tariff || "0"),
        extraBed: sr.extraBed,
        plan: sr.plan,
        advance: parseInt(advance || "0"),
        totalAmount: totalAmt,
        notes,
      });
      setIsEditingStay(false);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Error updating stay");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkClean = async () => {
    if (!room) return;
    setIsSubmitting(true);
    try {
      await updateRoomStatus({ roomId: room._id as any, status: "available" });
      onClose();
    } catch (e) {
      console.error(e);
      alert("Error marking room clean");
    } finally {
      setIsSubmitting(false);
    }
  };

  const computedDays = checkOut
    ? Math.max(1, differenceInDays(new Date(checkOut), new Date(checkIn)))
    : 1;

  const totalBookingAmount = selectedRooms.reduce((sum, sr) => 
    sum + (parseInt(sr.tariff || "0") + (sr.extraBed ? 500 : 0)) * computedDays, 
    0
  );

  const computedBalance = Math.max(
    0,
    totalBookingAmount - parseInt(advance || "0")
  );

  // For occupied rooms: derive balance from activeBooking if available
  const occupiedBalance = activeBooking
    ? activeBooking.balance ??
      Math.max(0, activeBooking.totalAmount - activeBooking.advance)
    : (room?.tariff || 0) * (room?.nights || 1) - (room?.advance || 0);

  const isOccupied =
    room?.status === "occupied" || room?.status === "pending_checkout";

  return (
    <AnimatePresence>
      {isOpen && room && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-10 pb-20 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 15 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="relative bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] w-full max-w-lg flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center border border-green-100">
                  <span className="text-xl font-black tracking-tighter text-green-700">
                    {room.roomNumber}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                    {isOccupied && !isFutureBookingMode
                      ? "Guest Details"
                      : "Room Booking"}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        statusColor[room.status] || "bg-gray-500"
                      )}
                    />
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                      {room.status.replace("_", " ")}
                    </span>
                    {activeBooking?.folioNumber && (
                      <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md ml-1">
                        {activeBooking.folioNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-6 overflow-y-auto no-scrollbar relative flex-1">
              {/* ── AVAILABLE: New Booking Form ── */}
              {room.status === "available" && (
                <div className="space-y-6">
                  {/* Guest Info */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <User size={14} /> Guest Identity
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="guestName"
                          className="text-xs font-semibold text-gray-700"
                        >
                          Full Name
                        </Label>
                        <Input
                          id="guestName"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Enter guest name"
                          onPointerDown={onPointerDown}
                          className="h-11 rounded-xl bg-gray-50/50 border-gray-200"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="phone"
                          className="text-xs font-semibold text-gray-700"
                        >
                          Phone Number
                        </Label>
                        <div className="flex gap-2">
                          <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            className="flex h-11 w-20 rounded-xl border border-gray-200 bg-gray-50/50 px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-green-500/20"
                          >
                            <option value="+91">+91</option>
                            <option value="+1">+1</option>
                            <option value="+44">+44</option>
                            <option value="+61">+61</option>
                            <option value="+971">+971</option>
                          </select>
                          <Input
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            type="tel"
                            placeholder="000-000-0000"
                            onPointerDown={onPointerDown}
                            className="h-11 rounded-xl bg-gray-50/50 border-gray-200 flex-1"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="idType"
                          className="text-xs font-semibold text-gray-700"
                        >
                          ID Type
                        </Label>
                        <select
                          id="idType"
                          value={idType}
                          onChange={(e) => setIdType(e.target.value)}
                          className="flex h-11 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20"
                        >
                          <option>Aadhar</option>
                          <option>Passport</option>
                          <option>Driving License</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="idNumber"
                          className="text-xs font-semibold text-gray-700"
                        >
                          ID Number
                        </Label>
                        <Input
                          id="idNumber"
                          value={idNumber}
                          onChange={(e) => setIdNumber(e.target.value)}
                          placeholder="XXXX XXXX"
                          onPointerDown={onPointerDown}
                          className="h-11 rounded-xl bg-gray-50/50 border-gray-200"
                        />
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <CalendarIcon size={14} /> Stay Schedule
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">
                          Check-in
                        </Label>
                        <DatePicker
                          date={checkIn ? new Date(checkIn) : undefined}
                          setDate={(d) =>
                            setCheckIn(d ? format(d, "yyyy-MM-dd") : "")
                          }
                          label="Select Check-in"
                          disabled={disabledDates}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">
                          Check-out
                        </Label>
                        <DatePicker
                          date={checkOut ? new Date(checkOut) : undefined}
                          setDate={(d) =>
                            setCheckOut(d ? format(d, "yyyy-MM-dd") : "")
                          }
                          label="Select Check-out"
                          min={checkIn ? new Date(checkIn) : undefined}
                          disabled={disabledDates}
                          align="end"
                        />
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  <hr className="border-gray-100" />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <BedDouble size={14} /> Rooms & Tariffs
                      </h3>
                      {availableRooms.length > 0 && (
                        <select
                          className="text-[10px] bg-green-50 text-green-700 border border-green-200 rounded-md px-2 py-1 font-bold outline-none cursor-pointer"
                          onChange={(e) => {
                            const r = availableRooms.find((room: any) => room._id === e.target.value);
                            if (r) {
                              setSelectedRooms([...selectedRooms, {
                                roomId: r._id,
                                roomNumber: r.roomNumber,
                                tariff: r.tariff.toString(),
                                extraBed: false,
                                plan: "EP"
                              }]);
                            }
                            e.target.value = "";
                          }}
                          value=""
                        >
                          <option value="">+ Add Room</option>
                          {availableRooms.map((r: any) => (
                            <option key={r._id} value={r._id}>Room {r.roomNumber}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="space-y-3">
                      {selectedRooms.map((sr, idx) => (
                        <div key={sr.roomId} className="bg-gray-50/50 rounded-xl border border-gray-100 p-4 relative group">
                          {idx > 0 && (
                            <button
                              onClick={() => setSelectedRooms(selectedRooms.filter(r => r.roomId !== sr.roomId))}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center border border-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={12} />
                            </button>
                          )}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-bold text-gray-900">Room {sr.roomNumber}</span>
                            <div className="flex items-center gap-2">
                              <Label className="text-[10px] font-bold text-gray-400">Extra Bed</Label>
                              <Switch
                                checked={sr.extraBed}
                                onCheckedChange={(val) => {
                                  const newList = [...selectedRooms];
                                  newList[idx].extraBed = val;
                                  setSelectedRooms(newList);
                                }}
                                className="scale-75"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-gray-400">Plan</Label>
                              <select
                                value={sr.plan}
                                onChange={(e) => {
                                  const newList = [...selectedRooms];
                                  newList[idx].plan = e.target.value;
                                  setSelectedRooms(newList);
                                }}
                                className="w-full h-9 rounded-lg bg-white border border-gray-200 text-sm font-bold px-2 outline-none focus:ring-2 focus:ring-green-500/20"
                              >
                                <option value="EP">EP (Room Only)</option>
                                <option value="CP">CP (Breakfast)</option>
                                <option value="MAP">MAP (Bkfst + 1 Meal)</option>
                                <option value="AP">AP (All Meals)</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-gray-400">Tariff/Night</Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                                <Input
                                  type="number"
                                  value={sr.tariff}
                                  onChange={(e) => {
                                    const newList = [...selectedRooms];
                                    newList[idx].tariff = e.target.value;
                                    setSelectedRooms(newList);
                                  }}
                                  className="h-9 pl-6 rounded-lg bg-white border-gray-200 text-sm font-bold"
                                />
                              </div>
                            </div>
                            <div className="flex flex-col justify-end">
                              <div className="text-[10px] font-bold text-gray-400 mb-1 text-right">Total</div>
                              <div className="text-sm font-black text-gray-900 text-right">
                                ₹{((parseInt(sr.tariff || "0") + (sr.extraBed ? 500 : 0)) * computedDays).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <CreditCard size={14} /> Overall Advance
                    </h3>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">
                        Total Advance Paid (<span className="text-gray-400">₹</span>)
                      </Label>
                      <Input
                        type="number"
                        value={advance}
                        onChange={(e) => setAdvance(e.target.value)}
                        onPointerDown={onPointerDown}
                        className="h-11 rounded-xl bg-green-50/50 border-green-200 text-green-700 font-bold tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">
                      Notes & Special Requests
                    </Label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      onPointerDown={onPointerDown}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-3 text-sm h-20 outline-none focus:ring-2 focus:ring-green-500/20 resize-none transition-colors"
                      placeholder="E.g. Extra bed requested..."
                    />
                  </div>
                </div>
              )}

              {/* ── DIRTY: Housekeeping ── */}
              {room.status === "dirty" && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-8">
                  <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center border border-orange-100">
                    <Droplets size={32} className="text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 block">
                      Housekeeping Required
                    </h3>
                    <p className="text-sm text-gray-500 mt-2">
                      This room was recently checked out and needs to be cleaned
                      before a new booking can be accepted.
                    </p>
                  </div>
                </div>
              )}

              {/* ── OCCUPIED / PENDING_CHECKOUT: Full Guest Details ── */}
              {isOccupied && (
                <div className="space-y-6">
                  {!isFutureBookingMode && !isEditingStay ? (
                    <>
                      {/* Guest Identity Card */}
                      <div className="bg-linear-to-br from-gray-50 to-white rounded-2xl border border-gray-100 overflow-hidden">
                        {/* Card header */}
                        <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                              <UserCheck size={15} className="text-green-700" />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                                Checked-in Guest
                              </p>
                              <p className="text-base font-bold text-gray-900 tracking-tight leading-tight">
                                {activeBooking?.guestName || room.guestName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {activeBooking?.status && (
                              <span
                                className={cn(
                                  "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border",
                                  statusBadge[activeBooking.status] ||
                                    "bg-gray-50 text-gray-500 border-gray-200"
                                )}
                              >
                                {activeBooking.status.replace("_", " ")}
                              </span>
                            )}
                            <Button
                              onClick={() => setIsEditingStay(true)}
                              variant="outline"
                              className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 gap-1.5 h-8 px-2.5 text-xs mr-2"
                            >
                              <Pencil size={12} /> Edit
                            </Button>
                            <Button
                              onClick={() => setIsFutureBookingMode(true)}
                              variant="outline"
                              className="rounded-xl border-green-200 text-green-700 hover:bg-green-50 gap-1.5 h-8 px-2.5 text-xs"
                            >
                              <Plus size={12} /> Future Stay
                            </Button>
                          </div>
                        </div>

                        {/* Details rows */}
                        <div className="px-4 divide-y divide-gray-50">
                          <DetailRow
                            icon={<Phone size={14} />}
                            label="Phone"
                            value={activeBooking?.guestPhone || "—"}
                          />
                          <DetailRow
                            icon={<CreditCard size={14} />}
                            label={activeBooking?.idType || "ID"}
                            value={activeBooking?.idNumber || "—"}
                          />
                          <DetailRow
                            icon={<CalendarIcon size={14} />}
                            label="Check-in → Check-out"
                            value={
                              activeBooking
                                ? `${activeBooking.checkIn} → ${activeBooking.checkOut}`
                                : room.checkInDate
                            }
                          />
                          <DetailRow
                            icon={<Clock size={14} />}
                            label="Duration"
                            value={
                              activeBooking
                                ? `${Math.max(
                                    1,
                                    differenceInDays(
                                      new Date(activeBooking.checkOut),
                                      new Date(activeBooking.checkIn)
                                    )
                                  )} Night${
                                    differenceInDays(
                                      new Date(activeBooking.checkOut),
                                      new Date(activeBooking.checkIn)
                                    ) !== 1
                                      ? "s"
                                      : ""
                                  }`
                                : `${room.nights} Nights`
                            }
                          />
                          <DetailRow
                            icon={<BedDouble size={14} />}
                            label="Meal Plan"
                            value={
                              activeBooking?.plan === "AP" ? "AP (All Meals)" :
                              activeBooking?.plan === "MAP" ? "MAP (Bkfst + 1 Meal)" :
                              activeBooking?.plan === "CP" ? "CP (Breakfast)" :
                              "EP (Room Only)"
                            }
                          />
                          {activeBooking?.extraBed && (
                            <DetailRow
                              icon={<Plus size={14} />}
                              label="Add-ons"
                              value="Extra Bed (+₹500/night)"
                            />
                          )}
                          {activeBooking?.notes && (
                            <DetailRow
                              icon={<StickyNote size={14} />}
                              label="Notes"
                              value={activeBooking.notes}
                            />
                          )}
                          {activeBooking?.source && (
                            <DetailRow
                              icon={<Hash size={14} />}
                              label="Booking Source"
                              value={activeBooking.source.replace("_", " ")}
                            />
                          )}
                        </div>
                      </div>

                      {/* Financial Summary */}
                      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                            <IndianRupee size={13} /> Financial Summary
                          </p>
                        </div>
                        <div className="px-4 divide-y divide-gray-50">
                          {/* <DetailRow
                            icon={<IndianRupee size={14} />}
                            label="Tariff / Night"
                            value={`₹${(
                              activeBooking?.tariff || room.tariff || 0
                            ).toLocaleString()}`}
                          /> */}
                          <DetailRow
                            icon={<CheckCircle2 size={14} />}
                            label="Total Amount"
                            value={`₹${(
                              activeBooking?.totalAmount ||
                              (room.tariff || 0) * (room.nights || 1)
                            ).toLocaleString()}`}
                          />
                          <DetailRow
                            icon={<CheckCircle2 size={14} />}
                            label="Advance Paid"
                            value={`₹${(
                              activeBooking?.advance ||
                              room.advance ||
                              0
                            ).toLocaleString()}`}
                          />
                          <DetailRow
                            icon={<IndianRupee size={14} />}
                            label="Balance Due"
                            value={`₹${occupiedBalance.toLocaleString()}`}
                            highlight
                          />
                        </div>
                      </div>
                    </>
                  ) : isEditingStay ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-6 overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-gray-900">
                          Edit Check-In Details
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingStay(false)}
                          className="h-7 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700">Full Name</Label>
                            <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} onPointerDown={onPointerDown} className="h-11 rounded-xl bg-gray-50 border-gray-200" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700">Phone</Label>
                            <div className="flex gap-2">
                              <Input value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="h-11 w-20 rounded-xl bg-gray-50 border-gray-200" placeholder="+91" onPointerDown={onPointerDown} />
                              <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="h-11 flex-1 rounded-xl bg-gray-50 border-gray-200" onPointerDown={onPointerDown} />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700">ID Type</Label>
                            <select value={idType} onChange={(e) => setIdType(e.target.value)} onPointerDown={onPointerDown} className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20">
                              <option value="Aadhar">Aadhar</option>
                              <option value="PAN">PAN</option>
                              <option value="Driving License">Driving License</option>
                              <option value="Passport">Passport</option>
                              <option value="Voter ID">Voter ID</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700">ID Number</Label>
                            <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className="h-11 rounded-xl bg-gray-50 border-gray-200 uppercase" onPointerDown={onPointerDown} />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-gray-700">Check-out Date</Label>
                          <DatePicker date={checkOut ? new Date(checkOut) : undefined} setDate={(d) => setCheckOut(d ? format(d, "yyyy-MM-dd") : "")} />
                        </div>
                        
                        {selectedRooms.map((sr, i) => (
                          <div key={i} className="space-y-4 p-4 border border-gray-200 rounded-xl bg-gray-50/50">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-gray-700">Room {sr.roomNumber}</h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-700">Tariff / Night</Label>
                                <Input type="number" value={sr.tariff} onChange={(e) => {
                                  const newRooms = [...selectedRooms];
                                  newRooms[i].tariff = e.target.value;
                                  setSelectedRooms(newRooms);
                                }} onPointerDown={onPointerDown} className="h-11 rounded-xl bg-white" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-700">Meal Plan</Label>
                                <select value={sr.plan} onChange={(e) => {
                                  const newRooms = [...selectedRooms];
                                  newRooms[i].plan = e.target.value;
                                  setSelectedRooms(newRooms);
                                }} onPointerDown={onPointerDown} className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none">
                                  <option value="EP">EP (Room Only)</option>
                                  <option value="CP">CP (Breakfast)</option>
                                  <option value="MAP">MAP (Bkfst + 1 Meal)</option>
                                  <option value="AP">AP (All Meals)</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                              <Label className="text-sm font-semibold text-gray-700">Extra Bed (+₹500)</Label>
                              <Switch checked={sr.extraBed} onCheckedChange={(checked) => {
                                const newRooms = [...selectedRooms];
                                newRooms[i].extraBed = checked;
                                setSelectedRooms(newRooms);
                              }} />
                            </div>
                          </div>
                        ))}

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-gray-700">Total Advance Paid</Label>
                          <Input type="number" value={advance} onChange={(e) => setAdvance(e.target.value)} onPointerDown={onPointerDown} className="h-11 rounded-xl bg-green-50 border-green-200 text-green-700 font-bold" />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-gray-700">Notes</Label>
                          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onPointerDown={onPointerDown} className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm h-20 outline-none" />
                        </div>
                        
                        <Button onClick={handleUpdateStay} disabled={isSubmitting} className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-500/20">
                          {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    /* Future Booking Form */
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-6 overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-gray-900">
                          Book Future Stay
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsFutureBookingMode(false)}
                          className="h-7 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="guestName"
                              className="text-xs font-semibold text-gray-700"
                            >
                              Full Name
                            </Label>
                            <Input
                              id="guestName"
                              value={guestName}
                              onChange={(e) => setGuestName(e.target.value)}
                              placeholder="Future guest name"
                              onPointerDown={onPointerDown}
                              className="h-11 rounded-xl bg-gray-50/50 border-gray-200"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="phone"
                              className="text-xs font-semibold text-gray-700"
                            >
                              Phone Number
                            </Label>
                            <div className="flex gap-2">
                              <select
                                value={countryCode}
                                onChange={(e) =>
                                  setCountryCode(e.target.value)
                                }
                                className="flex h-11 w-20 rounded-xl border border-gray-200 bg-gray-50/50 px-2 py-2 text-xs outline-none"
                              >
                                <option value="+91">+91</option>
                                <option value="+1">+1</option>
                                <option value="+44">+44</option>
                              </select>
                              <Input
                                id="phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                type="tel"
                                placeholder="000-000-0000"
                                onPointerDown={onPointerDown}
                                className="h-11 rounded-xl bg-gray-50/50 border-gray-200 flex-1"
                                required
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700">
                              New Check-in
                            </Label>
                            <DatePicker
                              date={checkIn ? new Date(checkIn) : undefined}
                              setDate={(d) =>
                                setCheckIn(d ? format(d, "yyyy-MM-dd") : "")
                              }
                              label="Check-in Date"
                              disabled={disabledDates}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700">
                              New Check-out
                            </Label>
                            <DatePicker
                              date={checkOut ? new Date(checkOut) : undefined}
                              setDate={(d) =>
                                setCheckOut(d ? format(d, "yyyy-MM-dd") : "")
                              }
                              label="Check-out Date"
                              min={checkIn ? new Date(checkIn) : undefined}
                              disabled={disabledDates}
                              align="end"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">
                          Notes
                        </Label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          onPointerDown={onPointerDown}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-3 text-sm h-20 outline-none focus:ring-2 focus:ring-green-500/20 resize-none transition-colors"
                          placeholder="Future booking notes..."
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Footer / Actions */}
            <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/50 shrink-0">
              {room.status === "available" && (
                <div className="flex items-center justify-between gap-8 flex-1">
                  <div className="flex items-center gap-6">
                    <div className="hidden sm:block">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                        Grand Total
                      </p>
                      <p className="text-lg font-bold text-gray-900 tabular-nums">
                        ₹{totalBookingAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="hidden sm:block w-px h-8 bg-gray-200" />
                    <div className="hidden sm:block">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">
                        Total Balance
                      </p>
                      <p className="text-xl font-black text-emerald-700 tabular-nums">
                        ₹{computedBalance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    disabled={isSubmitting}
                    onClick={handleConfirm}
                    className="w-full sm:w-auto h-12 px-8 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold tracking-wide shadow-sm active:scale-95 transition-all text-[15px]"
                  >
                    {isSubmitting ? "Processing..." : "Confirm Booking"}
                  </Button>
                </div>
              )}

              {room.status === "dirty" && (
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 w-full">
                  <Button
                    disabled={isSubmitting}
                    variant="outline"
                    onClick={onClose}
                    className="h-12 w-full sm:w-auto px-6 rounded-xl border-gray-200 font-semibold text-gray-600"
                  >
                    Close
                  </Button>
                  <Button
                    disabled={isSubmitting}
                    onClick={handleMarkClean}
                    className="h-12 w-full sm:w-auto px-8 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-sm"
                  >
                    {isSubmitting ? "Processing..." : "Mark as Cleaned"}
                  </Button>
                </div>
              )}

              {isOccupied && (
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                  {!isFutureBookingMode ? (
                    <>
                      <div className="flex-1 w-full bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                          Balance Due
                        </p>
                        <p className="text-xl font-bold text-gray-900 tabular-nums">
                          ₹{occupiedBalance.toLocaleString()}
                        </p>
                      </div>
                      <Button
                        disabled={isSubmitting}
                        variant="outline"
                        onClick={onClose}
                        className="h-12 w-full sm:w-auto px-6 rounded-xl border-gray-200 font-semibold text-gray-600"
                      >
                        Close
                      </Button>
                      <Button
                        disabled={isSubmitting}
                        onClick={handleCheckOut}
                        className="h-12 w-full sm:w-auto px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm"
                      >
                        {isSubmitting ? "Processing..." : "Settle & Checkout"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      disabled={isSubmitting}
                      onClick={handleConfirm}
                      className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold tracking-wide shadow-sm active:scale-95 transition-all text-[15px]"
                    >
                      {isSubmitting ? "Processing..." : "Confirm Future Booking"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}