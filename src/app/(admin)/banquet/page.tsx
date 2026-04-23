"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, CalendarPlus, FileText, CheckCircle2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc } from "../../../../convex/_generated/dataModel";
import { DesktopTopbar } from "@/components/Topbar";
import { toast } from "sonner";

export default function BanquetPage() {
  const [activeHall, setActiveHall] = useState<Doc<"banquetHalls"> | null>(null);
  const [view, setView] = useState<"list" | "bookings" | "new">("list");
  const [selectedBooking, setSelectedBooking] = useState<Doc<"banquetBookings"> | null>(null);
  
  const halls = useQuery(api.banquet.getAllHalls, {}) || [];
  const bookings = useQuery(api.banquet.getAllBanquetBookings) || [];
  const createBooking = useMutation(api.banquet.createBanquetBooking);
  const cancelBooking = useMutation(api.banquet.cancelBanquetBooking);

  // Form states
  const [eventType, setEventType] = useState("Wedding");
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [plateCost, setPlateCost] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [eventName, setEventName] = useState("");

  const [totalAmount, setTotalAmount] = useState("0");
  const [advance, setAdvance] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleViewBookings = (hall: Doc<"banquetHalls">) => {
    setActiveHall(hall);
    setView("bookings");
  };

  const handleNewBooking = (hall: Doc<"banquetHalls">) => {
    setActiveHall(hall);
    setEventType("Wedding");
    setEventDate("");
    setGuestCount("");
    setPlateCost("");
    setGuestName("");
    setGuestPhone("");
    setEventName("");
    setTotalAmount("0");
    setAdvance("0");
    setView("new");
  };

  const backToList = () => {
    setView("list");
    setActiveHall(null);
  };

  // Auto-calculate total if per-plate cost is provided
  useEffect(() => {
    const gc = parseInt(guestCount || "0");
    const pc = parseInt(plateCost || "0");
    if (gc > 0 && pc > 0) {
      setTotalAmount((gc * pc).toString());
    }
  }, [guestCount, plateCost]);

  const submitNewBooking = async () => {
    if (!activeHall) return;
    if (!eventDate || !guestName || !guestPhone || !eventName) {
      return alert("Please fill all required fields");
    }

    setIsSubmitting(true);
    try {
      await createBooking({
        hallId: activeHall._id,
        eventName,
        eventType,
        eventDate,
        guestName,
        guestPhone: `${countryCode}${guestPhone}`,
        guestCount: parseInt(guestCount || "0"),

        plateCost: parseInt(plateCost || "0") || undefined,
        totalAmount: parseInt(totalAmount || "0"),
        advance: parseInt(advance || "0")
      });
      toast.success("Booking confirmed!");
      backToList();
    } catch (e: any) {
      toast.error("Failed: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    try {
      await cancelBooking({ bookingId: selectedBooking._id });
      setSelectedBooking(null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to cancel booking.");
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <DesktopTopbar title="Banquet & Events" />
      <div className="p-5 lg:p-6 max-w-7xl mx-auto w-full pb-24 lg:pb-6">
      <AnimatePresence mode="popLayout">
        {view === "list" && (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full"
          >
            <div className="mb-5">
              <h1 className="text-xl font-bold text-gray-900">Banquet &amp; Events</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage hall bookings and upcoming events</p>
            </div>
            
            {halls.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                No banquet halls found. Please create one in Settings.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {halls.map((hall) => {
                  const upcomingCount = bookings.filter(b => b.hallId === hall._id && b.status !== "cancelled" && b.status !== "completed").length;
                  const fallbackImg = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=400&auto=format&fit=crop';

                  return (
                    <div key={hall._id}
                      className="bg-white rounded-2xl border border-t-4 border-green-500 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                      {/* Hall Image */}
                      <div className="h-36 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={hall.image || fallbackImg}
                          alt={hall.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-bold text-gray-900">{hall.name}</h3>
                          <div className="flex gap-2 mb-3">
                            <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                              {hall.type || "Event Space"}
                            </span>
                            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                              Capacity: {hall.capacity}
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${hall.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {hall.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                          <CalendarPlus size={14} className="text-green-600" />
                          {upcomingCount} Upcoming Bookings
                        </p>
                        <div className="flex gap-3 mt-4">
                          <Button variant="outline" onClick={() => handleViewBookings(hall)} className="flex-1 rounded-xl border-gray-200">
                            Bookings
                          </Button>
                          <Button disabled={!hall.isActive} onClick={() => handleNewBooking(hall)}
                            className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-sm disabled:bg-gray-200">
                            New Booking
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

            )}
          </motion.div>
        )}

        {/* View Bookings Slide */}
        {view === "bookings" && activeHall && (
          <motion.div
            key="bookings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full pb-20"
          >
            <button onClick={backToList} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
                <ChevronLeft size={18} /> Back to halls
              </button>
              <h1 className="text-xl font-bold text-gray-900 mb-5">{activeHall.name} — Bookings</h1>

            <div className="space-y-4">
              {bookings.filter(b => b.hallId === activeHall._id).map(booking => (
                <button key={booking._id}
                  className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-all hover:border-green-200"
                  onClick={() => setSelectedBooking(booking)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-gray-900">{booking.eventName}</h4>
                      <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-wide">{booking.eventType} · {booking.eventDate}</p>
                      <p className="text-sm text-gray-600 mt-1.5">{booking.guestName} · {booking.guestCount} guests</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {booking.status}
                      </span>
                      <p className="font-bold text-gray-900 tabular-nums mt-2">₹{booking.totalAmount.toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                </button>
              ))}
              {bookings.filter(b => b.hallId === activeHall._id).length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  No bookings found for this hall.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking & Details Modals */}
      <AnimatePresence>
          {/* New Booking Modal */}
          {view === "new" && activeHall && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-10 pb-20 sm:p-6">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={backToList}
              />
              <motion.div 
                initial={{ scale: 0.96, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 15 }}
                className="relative bg-white rounded-3xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden"
              >
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white z-10">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">New Event Booking</h2>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-0.5">{activeHall.name} • {activeHall.type}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={backToList} className="rounded-full">
                    <X size={20} />
                  </Button>
                </div>

                <div className="px-6 py-6 overflow-y-auto no-scrollbar flex-1 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-700">Event Title / Name</Label>
                      <Input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="e.g. Sharma Wedding" className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-700">Event Category</Label>
                      <select value={eventType} onChange={e => setEventType(e.target.value)} className="flex h-11 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm outline-none">
                        <option>Wedding</option>
                        <option>Corporate</option>
                        <option>Birthday</option>
                        <option>Social</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-700">Event Date</Label>
                      <Input type="date" value={eventDate} min={format(new Date(), 'yyyy-MM-dd')} onChange={e => setEventDate(e.target.value)} className="h-11 rounded-xl" />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-700">Expected Guests</Label>
                      <Input type="number" value={guestCount} onChange={e => setGuestCount(e.target.value)} placeholder={`Max ${activeHall.capacity}`} className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-700">Per Plate Cost (₹)</Label>
                      <Input type="number" value={plateCost} onChange={e => setPlateCost(e.target.value)} placeholder="0" className="h-11 rounded-xl" />
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-700">Contact Person</Label>
                      <Input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Name" className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-700">Phone Number</Label>
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
                        <Input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="000-000-0000" className="h-11 rounded-xl flex-1" />
                      </div>
                    </div>

                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-700">Total Contract (₹)</Label>
                      <Input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="h-12 rounded-xl text-lg font-bold tabular-nums" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-700">Advance Received (₹)</Label>
                      <Input type="number" value={advance} onChange={e => setAdvance(e.target.value)} className="h-12 rounded-xl text-lg font-bold text-green-700 bg-green-50/50 border-green-200 tabular-nums" />
                    </div>
                  </div>
                </div>

                <div className="px-6 py-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payable Balance</p>
                    <p className="text-xl font-bold text-gray-900 tabular-nums">₹{Math.max(0, parseInt(totalAmount || "0") - parseInt(advance || "0")).toLocaleString("en-IN")}</p>
                  </div>
                  <Button disabled={isSubmitting} onClick={submitNewBooking} className="h-12 px-8 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-sm">
                    {isSubmitting ? "Processing…" : "Confirm Booking"}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Details Modal */}
          {selectedBooking && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setSelectedBooking(null)}
              />
              <motion.div 
                initial={{ scale: 0.96, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 15 }}
                className="relative bg-white rounded-3xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden"
              >
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
                  <h2 className="text-lg font-bold text-gray-900">Event Details</h2>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedBooking(null)} className="rounded-full">
                    <X size={18} />
                  </Button>
                </div>
                <div className="px-6 py-6 space-y-5">
                   <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-xl text-gray-900">{selectedBooking.eventName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          {selectedBooking.eventType}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                          {selectedBooking.eventDate}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${selectedBooking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {selectedBooking.status}
                    </span>
                   </div>

                   <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Customer</p>
                      <p className="text-sm font-bold text-gray-900">{selectedBooking.guestName}</p>
                      <p className="text-xs text-gray-500 font-medium">{selectedBooking.guestPhone}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Attendance</p>
                      <p className="text-sm font-bold text-gray-900">{selectedBooking.guestCount} Guests</p>
                      {selectedBooking.plateCost && selectedBooking.plateCost > 0 && (
                        <p className="text-xs text-gray-500 font-medium">@ ₹{selectedBooking.plateCost} / plate</p>
                      )}
                    </div>
                   </div>

                   <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Contract Total</span>
                      <span className="font-bold text-gray-900">₹{selectedBooking.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Advance Paid</span>
                      <span className="font-bold text-green-600">₹{selectedBooking.advance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2.5 border-t border-gray-100">
                      <span className="text-sm font-bold text-gray-900">Outstanding Balance</span>
                      <span className="text-lg font-black text-rose-600 tabular-nums">₹{selectedBooking.balance.toLocaleString()}</span>
                    </div>
                   </div>
                </div>
                <div className="px-6 py-5 border-t border-gray-100 bg-gray-50 flex gap-3">
                  <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold text-gray-600" onClick={() => setSelectedBooking(null)}>Close</Button>
                  {selectedBooking?.status === 'confirmed' && (
                    <Button variant="destructive" className="flex-1 h-11 rounded-xl font-bold" onClick={handleCancelBooking}>Cancel Booking</Button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
