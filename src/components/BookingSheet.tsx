"use client";

import { useState, useEffect, useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { RoomViewData } from "@/components/RoomCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
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
  const [tariff, setTariff] = useState("0");
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [extraBed, setExtraBed] = useState(false);
  const [idType, setIdType] = useState("Aadhar");
  const [idNumber, setIdNumber] = useState("");
  const [checkIn, setCheckIn] = useState(format(new Date(), "yyyy-MM-dd"));
  const [checkOut, setCheckOut] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFutureBookingMode, setIsFutureBookingMode] = useState(false);
  const router = useRouter();

  const createBooking = useMutation(api.bookings.createBooking);
  const checkoutMutation = useMutation(api.bookings.checkOut);
  const updateRoomStatus = useMutation(api.rooms.updateRoomStatus);

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


  const existingGuest = useQuery(
    api.bookings.getGuestByPhone,
    phone.length >= 10 ? { phone } : "skip"
  );

  useEffect(() => {
    if (existingGuest && existingGuest._id) {
      if (!guestName) setGuestName(existingGuest.name);
      if (existingGuest.idType) setIdType(existingGuest.idType);
      if (existingGuest.idNumber) setIdNumber(existingGuest.idNumber);
    }
  }, [existingGuest]);

  useEffect(() => {
    if (room) {
      setTariff(room.tariff?.toString() || "0");
      setAdvance("0");
      setGuestName("");
      setPhone("");
      setIdNumber("");
      setCheckOut("");
      setNotes("");
      setExtraBed(false);
      setIsFutureBookingMode(false);
    }
  }, [room]);

  const onPointerDown = (e: React.PointerEvent) => e.stopPropagation();

  const handleConfirm = async () => {
    if (!guestName || !phone || !checkOut || !room)
      return alert("Please fill all required fields");
    setIsSubmitting(true);
    try {
      const days = differenceInDays(new Date(checkOut), new Date(checkIn));
      const totalNights = Math.max(1, days);
      const computedTotal =
        (parseInt(tariff) + (extraBed ? 500 : 0)) * totalNights;
      await createBooking({
        roomId: room._id as any,
        guestName,
        guestPhone: `${countryCode}${phone}`,
        idType,
        idNumber,
        checkIn,
        checkOut,
        tariff: parseInt(tariff),
        advance: parseInt(advance || "0"),
        totalAmount: computedTotal,
        extraBed,
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
  const computedTariff = parseInt(tariff || "0") + (extraBed ? 500 : 0);
  const computedBalance = Math.max(
    0,
    computedTariff * computedDays - parseInt(advance || "0")
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

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <ShieldCheck size={14} /> Financials
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">
                          Tariff/Night (
                          <span className="text-gray-400">₹</span>)
                        </Label>
                        <Input
                          type="number"
                          value={tariff}
                          onChange={(e) => setTariff(e.target.value)}
                          onPointerDown={onPointerDown}
                          className="h-11 rounded-xl bg-gray-50/50 border-gray-200 font-bold tabular-nums text-gray-900"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">
                          Advance Paid (<span className="text-gray-400">₹</span>
                          )
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
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <Plus size={14} /> Add-ons
                    </h3>
                    <div className="flex items-center justify-between bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                      <div>
                        <Label className="text-xs font-bold text-gray-700">
                          Extra Bed
                        </Label>
                        <p className="text-[10px] text-gray-400">
                          Additional room bed for ₹500/night
                        </p>
                      </div>
                      <Switch
                        checked={extraBed}
                        onCheckedChange={setExtraBed}
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
                  {!isFutureBookingMode ? (
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
                          {activeBooking?.extraBed && (
                            <DetailRow
                              icon={<BedDouble size={14} />}
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
                          <DetailRow
                            icon={<IndianRupee size={14} />}
                            label="Tariff / Night"
                            value={`₹${(
                              activeBooking?.tariff || room.tariff || 0
                            ).toLocaleString()}`}
                          />
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
                <div className="flex items-center justify-between gap-4">
                  <div className="hidden sm:block">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Total Balance
                    </p>
                    <p className="text-xl font-bold text-gray-900 tabular-nums">
                      ₹{computedBalance.toLocaleString()}
                    </p>
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