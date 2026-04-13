"use client";

import { useState, useEffect } from "react";
import { format, differenceInDays } from "date-fns";
import { RoomViewData } from "@/components/RoomCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar as CalendarIcon, User, UserCheck, ShieldCheck, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface BookingSheetProps {
  room: RoomViewData | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusColor: Record<string, string> = {
  'available': 'bg-emerald-500',
  'occupied': 'bg-rose-500',
  'pending_checkout': 'bg-amber-500',
  'dirty': 'bg-orange-500'
};

export function BookingSheet({ room, isOpen, onClose }: BookingSheetProps) {
  const [advance, setAdvance] = useState("0");
  const [tariff, setTariff] = useState("0");
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [idType, setIdType] = useState("Aadhar");
  const [idNumber, setIdNumber] = useState("");
  const [checkIn, setCheckIn] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [checkOut, setCheckOut] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const createBooking = useMutation(api.bookings.createBooking);
  const checkoutMutation = useMutation(api.bookings.checkOut);

  // Auto-fill guest profile
  const existingGuest = useQuery(api.bookings.getGuestByPhone, phone.length >= 10 ? { phone } : "skip");

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
    }
  }, [room]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  const handleConfirm = async () => {
    if (!guestName || !phone || !checkOut || !room) return alert("Please fill all required fields");

    setIsSubmitting(true);
    try {
      const days = differenceInDays(new Date(checkOut), new Date(checkIn));
      const totalNights = Math.max(1, days);
      const computedTotal = parseInt(tariff) * totalNights;

      await createBooking({
        roomId: room._id as any,
        guestName,
        guestPhone: phone,
        idType,
        idNumber,
        checkIn,
        checkOut,
        tariff: parseInt(tariff),
        advance: parseInt(advance || "0"),
        totalAmount: computedTotal,
        notes
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
    // Navigate to billing
    router.push("/billing");
    onClose();
  };

  const updateRoomStatus = useMutation(api.rooms.updateRoomStatus);

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

  const computedDays = checkOut ? Math.max(1, differenceInDays(new Date(checkOut), new Date(checkIn))) : 1;
  const computedBalance = Math.max(0, parseInt(tariff || '0') * computedDays - parseInt(advance || '0'));

  return (
    <AnimatePresence>
      {isOpen && room && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-10 pb-20 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
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
                  <span className="text-xl font-black tracking-tighter text-green-700">{room.roomNumber}</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">Room Booking</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn("w-2 h-2 rounded-full", statusColor[room.status] || 'bg-gray-500')} />
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{room.status.replace("_", " ")}</span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="px-6 py-6 overflow-y-auto no-scrollbar relative flex-1">
              {room.status === 'available' ? (
                <div className="space-y-6">
                  {/* Guest Info */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <User size={14} /> Guest Identity
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="guestName" className="text-xs font-semibold text-gray-700">Full Name</Label>
                        <Input id="guestName" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Enter guest name" onPointerDown={onPointerDown} className="h-11 rounded-xl bg-gray-50/50 border-gray-200" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-xs font-semibold text-gray-700">Phone Number</Label>
                        <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+91" onPointerDown={onPointerDown} className="h-11 rounded-xl bg-gray-50/50 border-gray-200" required />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="idType" className="text-xs font-semibold text-gray-700">ID Type</Label>
                        <select id="idType" value={idType} onChange={e => setIdType(e.target.value)} className="flex h-11 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20">
                          <option>Aadhar</option>
                          <option>Passport</option>
                          <option>Driving License</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="idNumber" className="text-xs font-semibold text-gray-700">ID Number</Label>
                        <Input id="idNumber" value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="XXXX XXXX" onPointerDown={onPointerDown} className="h-11 rounded-xl bg-gray-50/50 border-gray-200" />
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  {/* Stay Details */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <CalendarIcon size={14} /> Stay Schedule
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">Check-in</Label>
                        <Input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} onPointerDown={onPointerDown} className="h-11 rounded-xl bg-gray-50/50 border-gray-200 uppercase text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">Check-out</Label>
                        <Input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} onPointerDown={onPointerDown} className="h-11 rounded-xl bg-gray-50/50 border-gray-200 uppercase text-sm" required />
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  {/* Financials */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <ShieldCheck size={14} /> Financials
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">Tariff/Night (<span className="text-gray-400">₹</span>)</Label>
                        <Input type="number" value={tariff} onChange={e => setTariff(e.target.value)} onPointerDown={onPointerDown} className="h-11 rounded-xl bg-gray-50/50 border-gray-200 font-bold tabular-nums text-gray-900" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">Advance Paid (<span className="text-gray-400">₹</span>)</Label>
                        <Input type="number" value={advance} onChange={e => setAdvance(e.target.value)} onPointerDown={onPointerDown} className="h-11 rounded-xl bg-green-50/50 border-green-200 text-green-700 font-bold tabular-nums" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Notes & Special Requests</Label>
                    <textarea
                      value={notes} onChange={e => setNotes(e.target.value)} onPointerDown={onPointerDown}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-3 text-sm h-20 outline-none focus:ring-2 focus:ring-green-500/20 resize-none transition-colors"
                      placeholder="E.g. Extra bed requested..."
                    />
                  </div>
                </div>
              ) : room.status === 'dirty' ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-8">
                  <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center border border-orange-100">
                    <Droplets size={32} className="text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 block">Housekeeping Required</h3>
                    <p className="text-sm text-gray-500 mt-2">This room was recently checked out and needs to be cleaned before a new booking can be accepted.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Occupied State View */}
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <UserCheck size={18} className="text-green-700" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-0.5">Checked In Guest</p>
                        <p className="font-bold text-lg text-gray-900 tracking-tight">{room.guestName}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200/60">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Check-in Date</p>
                        <p className="text-sm font-semibold text-gray-900">{room.checkInDate}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Duration</p>
                        <p className="text-sm font-semibold text-gray-900">{room.nights} Nights</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer / Actions */}
            <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/50 shrink-0">
              {room.status === 'available' ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="hidden sm:block">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Balance</p>
                    <p className="text-xl font-bold text-gray-900 tabular-nums">₹{computedBalance.toLocaleString()}</p>
                  </div>
                  <Button disabled={isSubmitting} onClick={handleConfirm} className="w-full sm:w-auto h-12 px-8 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold tracking-wide shadow-sm active:scale-95 transition-all text-[15px]">
                    {isSubmitting ? "Processing..." : "Confirm Booking"}
                  </Button>
                </div>
              ) : room.status === 'dirty' ? (
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 w-full">
                  <Button disabled={isSubmitting} variant="outline" onClick={onClose} className="h-12 w-full sm:w-auto px-6 rounded-xl border-gray-200 font-semibold text-gray-600">
                    Close
                  </Button>
                  <Button disabled={isSubmitting} onClick={handleMarkClean} className="h-12 w-full sm:w-auto px-8 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-sm">
                    {isSubmitting ? "Processing..." : "Mark as Cleaned"}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                  <div className="flex-1 w-full bg-white px-4 py-2.5 rounded-xl border border-gray-200">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Payable Balance</p>
                    <p className="text-xl font-bold text-gray-900 tabular-nums">₹{((room.tariff || 0) * (room.nights || 1) - (room.advance || 0)).toLocaleString()}</p>
                  </div>
                  <Button disabled={isSubmitting} variant="outline" onClick={onClose} className="h-12 w-full sm:w-auto px-6 rounded-xl border-gray-200 font-semibold text-gray-600">
                    Close
                  </Button>
                  <Button disabled={isSubmitting} onClick={handleCheckOut} className="h-12 w-full sm:w-auto px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm">
                    {isSubmitting ? "Processing..." : "Settle & Checkout"}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
