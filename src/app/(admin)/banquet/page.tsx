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
import { printReceipt } from "@/lib/print";

export default function BanquetPage() {
  const [activeHall, setActiveHall] = useState<Doc<"banquetHalls"> | null>(null);
  const [view, setView] = useState<"list" | "bookings" | "new">("list");
  const [selectedBooking, setSelectedBooking] = useState<Doc<"banquetBookings"> | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTotal, setEditTotal] = useState("0");
  const [editAdvance, setEditAdvance] = useState("0");
  const [editNotes, setEditNotes] = useState("");
  
  const halls = useQuery(api.banquet.getAllHalls, {}) || [];
  const bookings = useQuery(api.banquet.getAllBanquetBookings, {}) || [];
  const rooms = useQuery(api.rooms.getAllRooms, {}) || [];
  const settings = useQuery(api.settings.getHotelSettings);
  const createBooking = useMutation(api.banquet.createBanquetBooking);
  const cancelBooking = useMutation(api.banquet.cancelBanquetBooking);
  const updateBooking = useMutation(api.banquet.updateBanquetBooking);

  // Form states
  const [eventType, setEventType] = useState("Wedding");
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [plateCost, setPlateCost] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [eventName, setEventName] = useState("");
  
  // New Inclusions
  const [isFullPropertySellOut, setIsFullPropertySellOut] = useState(false);
  const [includeRooms, setIncludeRooms] = useState(false);
  const [blockedRoomIds, setBlockedRoomIds] = useState<string[]>([]);
  const [roomDetails, setRoomDetails] = useState("");
  const [includeCafe, setIncludeCafe] = useState(false);
  const [cafeDetails, setCafeDetails] = useState("");
  const [includeRestaurant, setIncludeRestaurant] = useState(false);
  const [restaurantDetails, setRestaurantDetails] = useState("");

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
    setIsFullPropertySellOut(false);
    setIncludeRooms(false);
    setBlockedRoomIds([]);
    setRoomDetails("");
    setIncludeCafe(false);
    setCafeDetails("");
    setIncludeRestaurant(false);
    setRestaurantDetails("");
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
        advance: parseInt(advance || "0"),
        isFullPropertySellOut,
        includeRooms,
        roomDetails,
        blockedRoomIds: blockedRoomIds as any,
        includeCafe,
        cafeDetails,
        includeRestaurant,
        restaurantDetails,
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
                  
                  {/* Full Property Sell Out Action */}
                  <div className="bg-linear-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-green-900">Full Property Sell Out</h4>
                      <p className="text-xs text-green-700 mt-0.5">Quickly block all hotel facilities for this event</p>
                    </div>
                    <Button 
                      variant={isFullPropertySellOut ? "default" : "outline"}
                      className={`rounded-xl shadow-sm ${isFullPropertySellOut ? "bg-green-600 hover:bg-green-700 text-white" : "border-green-200 text-green-700 bg-white hover:bg-green-50"}`}
                      onClick={() => {
                        const newState = !isFullPropertySellOut;
                        setIsFullPropertySellOut(newState);
                        setIncludeRooms(newState);
                        setIncludeCafe(newState);
                        setIncludeRestaurant(newState);
                        // Auto-select all rooms if toggled on
                        if (newState) {
                          setBlockedRoomIds(rooms.map(r => r._id));
                          setRoomDetails("All available rooms blocked for event");
                          setCafeDetails("Cafe reserved for event catering");
                          setRestaurantDetails("Restaurant reserved for event catering");
                        } else {
                          setBlockedRoomIds([]);
                          setRoomDetails("");
                          setCafeDetails("");
                          setRestaurantDetails("");
                        }
                      }}
                    >
                      {isFullPropertySellOut ? "Enabled" : "Enable"}
                    </Button>
                  </div>

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

                  {/* Facilities & Inclusions Section */}
                  <div>
                    <Label className="text-sm font-bold text-gray-900 block mb-3">Facilities & Inclusions</Label>
                    <div className="space-y-3">
                      
                      {/* Rooms Inclusion */}
                      <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={includeRooms}
                            onChange={(e) => {
                              setIncludeRooms(e.target.checked);
                              if (!e.target.checked) setBlockedRoomIds([]);
                            }}
                            className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                          />
                          <span className="text-sm font-semibold text-gray-700">Include Hotel Rooms</span>
                        </label>
                        {includeRooms && (
                          <div className="mt-3 pl-7 space-y-3">
                            <Input 
                              value={roomDetails} 
                              onChange={e => setRoomDetails(e.target.value)} 
                              placeholder="e.g. 10 Deluxe Rooms for guests" 
                              className="h-9 text-xs rounded-lg bg-white" 
                            />
                            <div>
                              <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Select Rooms to Block</Label>
                              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                {rooms.map(room => {
                                  const isSelected = blockedRoomIds.includes(room._id);
                                  return (
                                    <button
                                      key={room._id}
                                      onClick={() => {
                                        if (isSelected) {
                                          setBlockedRoomIds(prev => prev.filter(id => id !== room._id));
                                        } else {
                                          setBlockedRoomIds(prev => [...prev, room._id]);
                                        }
                                      }}
                                      className={`py-1.5 rounded-md text-xs font-bold border transition-colors ${isSelected ? 'bg-green-100 border-green-300 text-green-800' : 'bg-white border-gray-200 text-gray-600 hover:border-green-200 hover:bg-green-50'}`}
                                    >
                                      {room.roomNumber}
                                    </button>
                                  )
                                })}
                                {rooms.length === 0 && (
                                  <span className="text-xs text-gray-500 col-span-full">No rooms found.</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Cafe Inclusion */}
                      <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={includeCafe}
                            onChange={(e) => setIncludeCafe(e.target.checked)}
                            className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                          />
                          <span className="text-sm font-semibold text-gray-700">Include Cafe</span>
                        </label>
                        {includeCafe && (
                          <div className="mt-3 pl-7">
                            <Input 
                              value={cafeDetails} 
                              onChange={e => setCafeDetails(e.target.value)} 
                              placeholder="e.g. Evening snacks & coffee setup" 
                              className="h-9 text-xs rounded-lg bg-white" 
                            />
                          </div>
                        )}
                      </div>

                      {/* Restaurant Inclusion */}
                      <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={includeRestaurant}
                            onChange={(e) => setIncludeRestaurant(e.target.checked)}
                            className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                          />
                          <span className="text-sm font-semibold text-gray-700">Include Restaurant</span>
                        </label>
                        {includeRestaurant && (
                          <div className="mt-3 pl-7">
                            <Input 
                              value={restaurantDetails} 
                              onChange={e => setRestaurantDetails(e.target.value)} 
                              placeholder="e.g. Reserved for buffet lunch" 
                              className="h-9 text-xs rounded-lg bg-white" 
                            />
                          </div>
                        )}
                      </div>

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

                   {selectedBooking.isFullPropertySellOut || selectedBooking.includeRooms || selectedBooking.includeCafe || selectedBooking.includeRestaurant ? (
                    <div className="py-4 border-y border-gray-50">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Included Facilities</p>
                      <div className="space-y-2">
                        {selectedBooking.isFullPropertySellOut && (
                          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-100 font-medium">
                            <CheckCircle2 size={16} /> Full Property Sell Out
                          </div>
                        )}
                        {selectedBooking.includeRooms && (
                          <div className="flex justify-between items-center text-sm px-2">
                            <span className="text-gray-700 font-semibold">Rooms Blocked ({selectedBooking.blockedRoomIds?.length || 0})</span>
                            <span className="text-gray-500 text-xs">{selectedBooking.roomDetails}</span>
                          </div>
                        )}
                        {selectedBooking.includeCafe && (
                          <div className="flex justify-between items-center text-sm px-2">
                            <span className="text-gray-700 font-semibold">Cafe Included</span>
                            <span className="text-gray-500 text-xs">{selectedBooking.cafeDetails}</span>
                          </div>
                        )}
                        {selectedBooking.includeRestaurant && (
                          <div className="flex justify-between items-center text-sm px-2">
                            <span className="text-gray-700 font-semibold">Restaurant Included</span>
                            <span className="text-gray-500 text-xs">{selectedBooking.restaurantDetails}</span>
                          </div>
                        )}
                      </div>
                    </div>
                   ) : null}

                   {editMode ? (
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-gray-700">Update Total (₹)</Label>
                          <Input type="number" value={editTotal} onChange={e => setEditTotal(e.target.value)} className="h-11 rounded-xl font-bold tabular-nums" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-gray-700">Update Advance (₹)</Label>
                          <Input type="number" value={editAdvance} onChange={e => setEditAdvance(e.target.value)} className="h-11 rounded-xl font-bold tabular-nums" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl h-11"
                          onClick={async () => {
                            try {
                              await updateBooking({
                                bookingId: selectedBooking._id,
                                totalAmount: parseInt(editTotal || "0"),
                                advance: parseInt(editAdvance || "0")
                              });
                              setEditMode(false);
                              toast.success("Bill updated successfully");
                            } catch (error) {
                              toast.error("Failed to update bill");
                            }
                          }}
                        >
                          Save Changes
                        </Button>
                        <Button variant="outline" className="h-11 rounded-xl" onClick={() => setEditMode(false)}>Cancel</Button>
                      </div>
                    </div>
                   ) : (
                    <div className="pt-2 flex justify-end">
                      <Button variant="outline" size="sm" className="text-xs font-bold rounded-lg text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => {
                        setEditTotal(selectedBooking.totalAmount.toString());
                        setEditAdvance(selectedBooking.advance.toString());
                        setEditMode(true);
                      }}>
                        Modify Bill Amounts
                      </Button>
                    </div>
                   )}

                </div>
                <div className="px-6 py-5 border-t border-gray-100 bg-gray-50 flex gap-3">
                  <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold text-gray-600" onClick={() => { setSelectedBooking(null); setEditMode(false); }}>Close</Button>
                  {selectedBooking?.status === 'confirmed' && (
                    <Button variant="destructive" className="flex-1 h-11 rounded-xl font-bold" onClick={handleCancelBooking}>Cancel Booking</Button>
                  )}
                  <Button 
                    className="flex-1 h-11 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
                    onClick={async () => {
                      if (!selectedBooking) return;
                      const el = document.getElementById("banquet-normal-receipt");
                      if (!el) return;
                      try {
                        toast.loading("Generating invoice...", { id: "print" });
                        await printReceipt(el.innerHTML, false);
                        toast.success("Invoice sent to printer", { id: "print" });
                      } catch (err) {
                        toast.error("Failed to print invoice", { id: "print" });
                      }
                    }}
                  >
                    <FileText size={16} /> Print Invoice
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Hidden print container */}
      <div style={{ display: "none" }}>
        <div id="banquet-normal-receipt">
          {selectedBooking && <BanquetA4Invoice booking={selectedBooking} settings={settings} rooms={rooms} />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Banquet A4 Invoice Layout (matching billing/page.tsx)
// ─────────────────────────────────────────────────────────────────────────────

function BanquetA4Invoice({ booking, settings, rooms }: { booking: Doc<"banquetBookings">, settings: any, rooms: Doc<"rooms">[] }) {
  const hotelName = settings?.hotelName || "Sarovar Palace";
  const address = settings?.address || "Lukerganj, Prayagraj";
  const phone = settings?.phone || "";
  const email = settings?.email || "";
  const gstin = settings?.gstin || "09AABCU9603R1ZN";
  const now = new Date();

  let extraChargesTotal = 0;
  // Collect line items
  const lineItems: { description: React.ReactNode; qty: string; rate: string; amountDisplay: string }[] = [];

  if (booking.extraCharges) {
    booking.extraCharges.forEach((charge: any) => {
      extraChargesTotal += charge.amount;
      lineItems.push({
        description: charge.description,
        qty: "1",
        rate: `₹${charge.amount.toLocaleString("en-IN")}`,
        amountDisplay: `₹${charge.amount.toLocaleString("en-IN")}`
      });
    });
  }

  const baseBanquetAmount = booking.totalAmount - extraChargesTotal;

  // Build the nested breakdown for inclusions
  const hasInclusions = (booking.includeRooms && booking.blockedRoomIds?.length) || booking.includeRestaurant || booking.includeCafe;

  lineItems.unshift({
    description: (
      <div>
        <div style={{ fontWeight: "600", fontSize: 13, marginBottom: hasInclusions ? 8 : 0 }}>
          Banquet Event Package: {booking.eventName}
        </div>
        
        {hasInclusions && (
          <div style={{ paddingLeft: 12, borderLeft: "2px solid #eee", fontSize: 11, color: "#444" }}>
            
            {/* Rooms Breakdown */}
            {booking.includeRooms && booking.blockedRoomIds && booking.blockedRoomIds.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: "bold", color: "#222", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10 }}>
                  Rooms
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {booking.blockedRoomIds.map(roomId => {
                    const room = rooms.find(r => r._id === roomId);
                    if (!room) return null;
                    return (
                      <div key={roomId} style={{ display: "flex", justifyContent: "space-between", maxWidth: 300, paddingLeft: 8 }}>
                        <span>Room {room.roomNumber} ({room.category})</span>
                        <span>₹{room.tariff?.toLocaleString("en-IN") || 0}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Restaurant Breakdown */}
            {booking.includeRestaurant && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: "bold", color: "#222", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10 }}>
                  Restaurant
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 300, paddingLeft: 8 }}>
                  <span>{booking.restaurantDetails || "Standard Dining"}</span>
                  <span>Included</span>
                </div>
              </div>
            )}

            {/* Cafe Breakdown */}
            {booking.includeCafe && (
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontWeight: "bold", color: "#222", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10 }}>
                  Cafe
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 300, paddingLeft: 8 }}>
                  <span>{booking.cafeDetails || "Standard Service"}</span>
                  <span>Included</span>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    ),
    qty: "1",
    rate: `₹${baseBanquetAmount.toLocaleString("en-IN")}`,
    amountDisplay: `₹${baseBanquetAmount.toLocaleString("en-IN")}`,
  });

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
                {settings?.includeGST !== false && <><br />GSTIN: {gstin}</>}
              </div>
            </div>
          </div>

          {/* Right: Invoice label */}
          <div style={{ textAlign: "right", paddingTop: 4 }}>
            <div style={{ fontSize: 9, fontWeight: "bold", letterSpacing: "0.22em", textTransform: "uppercase", color: "#666", marginBottom: 6 }}>
              Event Invoice
            </div>
            <div style={{ fontSize: 22, fontWeight: "bold", letterSpacing: "0.04em", fontFamily: mono, color: "#000", lineHeight: 1 }}>
              EVT-{booking._id.substring(0, 6).toUpperCase()}
            </div>
            <div style={{ width: 40, height: 1.5, background: "#000", margin: "8px 0 8px auto" }} />
            <div style={{ fontSize: 10, color: "#444", lineHeight: 1.7 }}>
              <div>{format(now, "dd MMMM yyyy")}</div>
              <div style={{ fontFamily: mono }}>{format(now, "hh:mm a")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── GUEST + EVENT DETAILS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", margin: "0", borderBottom: "1px solid #000" }}>

        {/* Billed To */}
        <div style={{ padding: "20px 28px 20px 48px", borderRight: "1px solid #ddd" }}>
          <div style={{ fontSize: 8.5, fontWeight: "bold", letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: 10 }}>
            Billed To
          </div>
          <div style={{ fontSize: 15, fontWeight: "bold", color: "#000", marginBottom: 4, letterSpacing: "0.02em" }}>
            {booking.guestName}
          </div>
          {booking.guestPhone && (
            <div style={{ fontSize: 11, color: "#555", marginBottom: 2 }}>{booking.guestPhone}</div>
          )}
        </div>

        {/* Event details */}
        <div style={{ padding: "20px 48px 20px 28px" }}>
          <div style={{ fontSize: 8.5, fontWeight: "bold", letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: 10 }}>
            Event Details
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <tbody>
              {[
                ["Event Name", booking.eventName],
                ["Event Date", booking.eventDate],
                ["Guests", booking.guestCount],
                ...(booking.plateCost ? [["Per Plate", `₹${booking.plateCost}`]] : []),
              ].map(([label, val], i) => (
                <tr key={i}>
                  <td style={{ paddingBottom: 5, color: "#666", width: "45%" }}>{label}</td>
                  <td style={{ paddingBottom: 5, fontWeight: "600", color: "#000", textAlign: "right" }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── LINE ITEMS TABLE ── */}
      <div style={{ padding: "0 48px", minHeight: "200px" }}>
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
                <td style={{ padding: "11px 12px 11px 0", color: "#000", fontWeight: "normal", lineHeight: 1.4, fontSize: 12 }}>
                  {item.description}
                </td>
                <td style={{ padding: "11px 12px", textAlign: "right", color: "#444", fontFamily: mono, fontSize: 11, verticalAlign: "top" }}>{item.qty}</td>
                <td style={{ padding: "11px 12px", textAlign: "right", color: "#444", fontFamily: mono, fontSize: 11, verticalAlign: "top" }}>{item.rate}</td>
                <td style={{ padding: "11px 0 11px 12px", textAlign: "right", fontWeight: "600", color: "#000", fontFamily: mono, fontSize: 12, verticalAlign: "top" }}>
                  {item.amountDisplay}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── TOTALS + PAYMENT ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "2px solid #000", marginTop: 0, position: "absolute", bottom: 12, width: "100%" }}>

        {/* Left: Payment info + Thank you */}
        <div style={{ padding: "22px 28px 22px 48px", borderRight: "1px solid #ddd" }}>
          {booking.advance > 0 && (
            <div style={{ borderTop: "1px dashed #bbb", paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#777" }}>
              <span>Advance Paid</span>
              <span style={{ fontFamily: mono }}>₹{booking.advance.toLocaleString("en-IN")}</span>
            </div>
          )}

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #e0e0e0" }}>
            <div style={{ fontSize: 12, color: "#444", fontStyle: "italic", lineHeight: 1.7 }}>
              Thank you for choosing <strong style={{ fontStyle: "normal", color: "#000" }}>{hotelName}</strong>.<br />
              We hope your event is a grand success.
            </div>
            {settings?.includeGST !== false && (
              <div style={{ marginTop: 8, fontSize: 9, color: "#999", letterSpacing: "0.04em" }}>
                This is a computer generated tax invoice.
              </div>
            )}
            {/* Google Review QR */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px dashed #ddd", display: "flex", alignItems: "center", gap: 16 }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent("https://g.page/r/CRoioQu179CPEBM/review")}&qzone=1&format=png`}
                alt="Google Review QR"
                style={{ width: 80, height: 80, flexShrink: 0, display: "block" }}
              />
              <div>
                <div style={{ fontSize: 11, fontWeight: "bold", color: "#000", marginBottom: 3 }}>Enjoyed your event?</div>
                <div style={{ fontSize: 10, color: "#555", lineHeight: 1.5 }}>Scan the QR code to leave us<br />a Google review. It helps us grow!</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Summary */}
        <div style={{ padding: "22px 48px 22px 28px" }}>
          <div style={{ fontSize: 8.5, fontWeight: "bold", letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: 12 }}>
            Summary
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <tbody>
              <tr>
                <td style={{ paddingBottom: 8, color: "#555" }}>Total Amount</td>
                <td style={{ paddingBottom: 8, textAlign: "right", fontFamily: mono, color: "#000" }}>₹{booking.totalAmount.toLocaleString("en-IN")}</td>
              </tr>
              <tr>
                <td style={{ paddingBottom: 8, color: "#555" }}>Advance Paid</td>
                <td style={{ paddingBottom: 8, textAlign: "right", fontFamily: mono, color: "#000" }}>- ₹{booking.advance.toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
          </table>

          {/* Grand Total box */}
          <div style={{ borderTop: "2px solid #000", marginTop: 4, paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontWeight: "bold", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#000" }}>
              Balance Due
            </span>
            <span style={{ fontWeight: "bold", fontSize: 22, fontFamily: mono, color: "#000", letterSpacing: "0.02em" }}>
              ₹{booking.balance.toLocaleString("en-IN")}
            </span>
          </div>
          <div style={{ borderTop: "4px double #000", marginTop: 6 }} />
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ borderTop: "1px solid #000", padding: "12px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "absolute", bottom: 0, width: "100%" }}>
        <div style={{ fontSize: 9, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {hotelName} · {address}
        </div>
        <div style={{ fontSize: 9, color: "#888", fontFamily: mono }}>
          EVT-{booking._id.substring(0, 6).toUpperCase()}
        </div>
      </div>

      {/* ── BOTTOM BORDER ── */}
      <div style={{ height: 1, background: "#000", position: "absolute", bottom: -9, width: "100%" }} />
      <div style={{ height: 2, background: "#fff", position: "absolute", bottom: -8, width: "100%" }} />
      <div style={{ height: 6, background: "#000", position: "absolute", bottom: -6, width: "100%" }} />

    </div>
  );
}
