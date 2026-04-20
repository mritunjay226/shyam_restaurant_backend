import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

// ─────────────────────────────────────────────────────────────────
// FOLIO NUMBER HELPER
// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// BOOKING HELPERS
// ─────────────────────────────────────────────────────────────────
async function nextFolio(ctx: any): Promise<string> {
  const existing = await ctx.db
    .query("counters")
    .withIndex("by_name", (q: any) => q.eq("name", "folio"))
    .first();

  let n: number;
  if (existing) {
    n = existing.value + 1;
    await ctx.db.patch(existing._id, { value: n });
  } else {
    n = 1;
    await ctx.db.insert("counters", { name: "folio", value: 1 });
  }

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `FLO-${today}-${String(n).padStart(5, "0")}`;
}

function generateTrackingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No O, I, 0, 1 to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ─────────────────────────────────────────────────────────────────
// DATE OVERLAP CHECK  — returns true if [a1,a2) overlaps [b1,b2)
// Dates are "YYYY-MM-DD" strings — lexicographic compare works fine
// ─────────────────────────────────────────────────────────────────
function overlaps(
  newIn: string, newOut: string,
  existIn: string, existOut: string
): boolean {
  return newIn < existOut && newOut > existIn;
}

// ─────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────

export const getAllBookings = query({
  handler: async (ctx) => ctx.db.query("bookings").collect(),
});

export const getBookingsByRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) =>
    ctx.db
      .query("bookings")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect(),
});

export const getTodayArrivals = query({
  args: { today: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("bookings")
      .filter((q) =>
        q.and(q.eq(q.field("checkIn"), args.today), q.eq(q.field("status"), "confirmed"))
      )
      .collect(),
});

export const getTodayDepartures = query({
  args: { today: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("bookings")
      .filter((q) =>
        q.and(q.eq(q.field("checkOut"), args.today), q.eq(q.field("status"), "checked_in"))
      )
      .collect(),
});

/** Get or look up guest history by phone number */
export const getGuestByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("guests")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first(),
});

export const getBookingByTrackingCode = query({
  args: { trackingCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookings")
      .withIndex("by_trackingCode", (q) => q.eq("trackingCode", args.trackingCode))
      .first();
  },
});

export const getBookingById = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.bookingId);
  },
});

// ─────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────

export const createBooking = mutation({
  args: {
    roomId: v.id("rooms"),
    guestName: v.string(),
    guestPhone: v.string(),
    idType: v.optional(v.string()),
    idNumber: v.optional(v.string()),
    checkIn: v.string(),
    checkOut: v.string(),
    tariff: v.number(),
    advance: v.number(),
    totalAmount: v.number(),
    gstBill: v.optional(v.boolean()),
    extraBed: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    source: v.optional(v.string()),   // "walk_in", "phone", "ota"
  },
  handler: async (ctx, args) => {
    // ── 1. DATE OVERLAP CHECK ──────────────────────────────────────
    // Find all active bookings for this room (not cancelled/checked_out)
    const activeBookings = await ctx.db
      .query("bookings")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "checked_out")
        )
      )
      .collect();

    for (const b of activeBookings) {
      if (overlaps(args.checkIn, args.checkOut, b.checkIn, b.checkOut)) {
        throw new Error(
          `Room is already booked from ${b.checkIn} to ${b.checkOut} (${b.guestName}). Please choose different dates.`
        );
      }
    }

    // ── 2. GUEST PROFILE (upsert) ──────────────────────────────────
    let guestId: any;
    const existingGuest = await ctx.db
      .query("guests")
      .withIndex("by_phone", (q) => q.eq("phone", args.guestPhone))
      .first();

    if (existingGuest) {
      // Update visit count and spend
      await ctx.db.patch(existingGuest._id, {
        totalVisits: existingGuest.totalVisits + 1,
        totalSpend: existingGuest.totalSpend + args.totalAmount,
        // Update ID details if provided
        ...(args.idType ? { idType: args.idType } : {}),
        ...(args.idNumber ? { idNumber: args.idNumber } : {}),
      });
      guestId = existingGuest._id;
    } else {
      guestId = await ctx.db.insert("guests", {
        name: args.guestName,
        phone: args.guestPhone,
        idType: args.idType,
        idNumber: args.idNumber,
        totalVisits: 1,
        totalSpend: args.totalAmount,
      });
    }

    // ── 3. FOLIO NUMBER ───────────────────────────────────────────
    const folioNumber = await nextFolio(ctx);

    // ── 4. UPDATE ROOM STATUS ─────────────────────────────────────
    await ctx.db.patch(args.roomId, { status: "occupied" });

    // ── 5. CREATE BOOKING ─────────────────────────────────────────
    const bookingId = await ctx.db.insert("bookings", {
      roomId: args.roomId,
      guestId,
      folioNumber,
      guestName: args.guestName,
      guestPhone: args.guestPhone,
      idType: args.idType,
      idNumber: args.idNumber,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      tariff: args.tariff,
      advance: args.advance,
      balance: args.totalAmount - args.advance,
      totalAmount: args.totalAmount,
      status: "confirmed",
      gstBill: args.gstBill,
      extraBed: args.extraBed,
      notes: args.notes,
      source: args.source ?? "walk_in",
      trackingCode: generateTrackingCode(),
    });

    // ── 6. RECORD ADVANCE PAYMENT IN BILLS (shows in revenue) ─────
    if (args.advance > 0) {
      await ctx.db.insert("bills", {
        billType: "room",
        referenceId: bookingId as string,
        guestName: args.guestName,
        isGstBill: false,
        subtotal: args.advance,
        cgst: 0,
        sgst: 0,
        totalAmount: args.advance,
        advancePaid: args.advance,
        paymentMethod: args.source === "website" ? "online" : "cash",
        status: "paid",
        createdAt: new Date().toISOString().split("T")[0],
      });
    }

    return bookingId;
  },
});

export const checkIn = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");
    await ctx.db.patch(args.bookingId, { status: "checked_in" });
    await ctx.db.patch(booking.roomId, { status: "occupied" });
    return { success: true };
  },
});

export const checkOut = mutation({
  args: { bookingId: v.id("bookings"), paymentMethod: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");
    await ctx.db.patch(args.bookingId, { status: "checked_out" });
    await ctx.db.patch(booking.roomId, { status: "dirty" });
    return { success: true };
  },
});

export const cancelBooking = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");
    await ctx.db.patch(args.bookingId, { status: "cancelled" });
    await ctx.db.patch(booking.roomId, { status: "available" });
    return { success: true };
  },
});

export const createPendingBooking = mutation({
  args: {
    roomId: v.id("rooms"),
    guestName: v.string(),
    guestPhone: v.string(),
    checkIn: v.string(),
    checkOut: v.string(),
    tariff: v.number(),
    advance: v.number(),
    totalAmount: v.number(),
    notes: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const thirtyMinsAgo = now - (30 * 60 * 1000);

    const activeBookings = await ctx.db
      .query("bookings")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "checked_out"),
          // Only count pending if they are recent
          q.or(
            q.neq(q.field("status"), "pending"),
            q.gt(q.field("_creationTime"), thirtyMinsAgo)
          )
        )
      )
      .collect();

    for (const b of activeBookings) {
      if (overlaps(args.checkIn, args.checkOut, b.checkIn, b.checkOut)) {
        throw new Error("Room is already booked for these dates.");
      }
    }

    // 2. Generate Tracking Code
    let trackingCode = generateTrackingCode();
    // Check for collisions (rare but good to have)
    const existing = await ctx.db.query("bookings").withIndex("by_trackingCode", q => q.eq("trackingCode", trackingCode)).first();
    if (existing) trackingCode = generateTrackingCode();

    // 3. Create Pending Booking
    const bookingId = await ctx.db.insert("bookings", {
      roomId: args.roomId,
      guestName: args.guestName,
      guestPhone: args.guestPhone,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      tariff: args.tariff,
      advance: args.advance,
      balance: args.totalAmount - args.advance,
      totalAmount: args.totalAmount,
      status: "pending",
      paymentStatus: "pending",
      source: args.source || "website",
      notes: args.notes,
      trackingCode,
    });

    return { bookingId, trackingCode };
  },
});

export const setRazorpayOrderId = mutation({
  args: { bookingId: v.id("bookings"), razorpayOrderId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.bookingId, { razorpayOrderId: args.razorpayOrderId });
  },
});

export const confirmPayment = mutation({
  args: { 
    bookingId: v.id("bookings"), 
    paymentId: v.string(),
    razorpayOrderId: v.string()
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.razorpayOrderId !== args.razorpayOrderId) {
      throw new Error("Razorpay Order ID mismatch. Internal security error.");
    }

    const folioNumber = await nextFolio(ctx);

    await ctx.db.patch(args.bookingId, {
      status: "confirmed",
      paymentStatus: "paid",
      paymentId: args.paymentId,
      folioNumber,
    });

    // Schedule WhatsApp confirmation
    await ctx.scheduler.runAfter(0, internal.notifications.sendWhatsAppBookingConfirmation, {
      phone: booking.guestPhone,
      guestName: booking.guestName,
      checkIn: booking.checkIn,
      trackingCode: booking.trackingCode || "",
      hotelName: "Sarovar Palace",
    });

    // Record in bills
    await ctx.db.insert("bills", {
      billType: "room",
      referenceId: args.bookingId,
      guestName: booking.guestName,
      isGstBill: false,
      subtotal: booking.advance,
      cgst: 0,
      sgst: 0,
      totalAmount: booking.advance,
      advancePaid: booking.advance,
      paymentMethod: "online",
      status: "paid",
      createdAt: new Date().toISOString().split("T")[0],
    });

    return { success: true, trackingCode: booking.trackingCode };
  },
});

export const updateAdvance = mutation({
  args: { bookingId: v.id("bookings"), advance: v.number() },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");
    return ctx.db.patch(args.bookingId, {
      advance: args.advance,
      balance: booking.totalAmount - args.advance,
    });
  },
});

export const confirmPaymentByOrderId = mutation({
  args: { 
    razorpayOrderId: v.string(), 
    paymentId: v.string() 
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_razorpayOrderId", (q) => q.eq("razorpayOrderId", args.razorpayOrderId))
      .first();

    if (!booking) {
      console.warn("Booking not found for Razorpay Order ID:", args.razorpayOrderId);
      return { success: false, reason: "not_found" };
    }

    if (booking.status === "confirmed") {
      return { success: true, trackingCode: booking.trackingCode, alreadyConfirmed: true };
    }

    const folioNumber = await nextFolio(ctx);

    await ctx.db.patch(booking._id, {
      status: "confirmed",
      paymentStatus: "paid",
      paymentId: args.paymentId,
      folioNumber,
    });

    // Schedule WhatsApp confirmation
    await ctx.scheduler.runAfter(0, internal.notifications.sendWhatsAppBookingConfirmation, {
      phone: booking.guestPhone,
      guestName: booking.guestName,
      checkIn: booking.checkIn,
      trackingCode: booking.trackingCode || "",
      hotelName: "Sarovar Palace",
    });

    await ctx.db.insert("bills", {
      billType: "room",
      referenceId: booking._id,
      guestName: booking.guestName,
      isGstBill: false,
      subtotal: booking.advance,
      cgst: 0,
      sgst: 0,
      totalAmount: booking.advance,
      advancePaid: booking.advance,
      paymentMethod: "online",
      status: "paid",
      createdAt: new Date().toISOString().split("T")[0],
    });

    console.log("Booking confirmed via webhook:", booking._id);
    return { success: true, trackingCode: booking.trackingCode };
  },
});