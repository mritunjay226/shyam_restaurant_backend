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

async function createSingleBookingInternal(ctx: any, args: any, groupBookingId?: string) {
  // ── 1. DATE OVERLAP CHECK ──────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const activeBookings = await ctx.db
    .query("bookings")
    .withIndex("by_room", (q: any) => q.eq("roomId", args.roomId))
    .filter((q: any) =>
      q.and(
        q.neq(q.field("status"), "cancelled"),
        q.neq(q.field("status"), "checked_out")
      )
    )
    .collect();

  for (const b of activeBookings) {
    if (b.status === "checked_in") {
    } else if (b.status === "confirmed" && b.checkIn > today) {
    } else {
      continue;
    }

    if (overlaps(args.checkIn, args.checkOut, b.checkIn, b.checkOut)) {
      const room = await ctx.db.get(args.roomId);
      throw new Error(
        `Room ${room?.roomNumber} is already booked from ${b.checkIn} to ${b.checkOut} (${b.guestName}).`
      );
    }
  }

  // ── 2. GUEST PROFILE (upsert) ──────────────────────────────────
  let guestId: any;
  const existingGuest = await ctx.db
    .query("guests")
    .withIndex("by_phone", (q: any) => q.eq("phone", args.guestPhone))
    .first();

  if (existingGuest) {
    await ctx.db.patch(existingGuest._id, {
      totalVisits: existingGuest.totalVisits + 1,
      totalSpend: existingGuest.totalSpend + args.totalAmount,
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

  // ── 4. CLEAR PREVIOUS ACTIVE BOOKINGS FOR THIS ROOM ───────────
  // If the room was already booked (e.g. Banquet Block), we check out those bookings
  // to ensure only the newest booking is active and visible in billing.
  const previousBlocks = await ctx.db
    .query("bookings")
    .withIndex("by_room", (q: any) => q.eq("roomId", args.roomId))
    .filter((q: any) => 
      q.and(
        q.or(
          q.eq(q.field("status"), "confirmed"),
          q.eq(q.field("status"), "checked_in")
        ),
        // Only auto-checkout if it's a Banquet Block or a stale block
        q.or(
          q.regex(q.field("guestName"), /.*\(Banquet Block\).*/),
          q.eq(q.field("tariff"), 0)
        )
      )
    )
    .collect();

  for (const b of previousBlocks) {
    await ctx.db.patch(b._id, { status: "checked_out" });
  }

  // ── 5. UPDATE ROOM STATUS ─────────────────────────────────────
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
    plan: args.plan || "EP",
    notes: args.notes,
    source: args.source ?? "walk_in",
    trackingCode: generateTrackingCode(),
    groupBookingId,
  });

  // ── 6. RECORD ADVANCE PAYMENT IN BILLS ─────
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
}

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
    plan: v.optional(v.string()),
    notes: v.optional(v.string()),
    source: v.optional(v.string()),   // "walk_in", "phone", "ota"
  },
  handler: async (ctx, args) => {
    return await createSingleBookingInternal(ctx, args);
  },
});

export const createMultiRoomBooking = mutation({
  args: {
    rooms: v.array(v.object({
      roomId: v.id("rooms"),
      tariff: v.number(),
      extraBed: v.optional(v.boolean()),
      plan: v.optional(v.string()),
    })),
    guestName: v.string(),
    guestPhone: v.string(),
    idType: v.optional(v.string()),
    idNumber: v.optional(v.string()),
    checkIn: v.string(),
    checkOut: v.string(),
    advance: v.number(),
    notes: v.optional(v.string()),
    source: v.optional(v.string()),
    gstBill: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const groupBookingId = `GRP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const bookingIds = [];

    // Simple day calculation
    const d1 = new Date(args.checkIn);
    const d2 = new Date(args.checkOut);
    const nights = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000));

    for (let i = 0; i < args.rooms.length; i++) {
      const roomReq = args.rooms[i];
      const roomTotal = (roomReq.tariff + (roomReq.extraBed ? 500 : 0)) * nights;
      
      // Advance is only assigned to the first booking for accounting clarity
      const roomAdvance = i === 0 ? args.advance : 0;

      const bid = await createSingleBookingInternal(ctx, {
        ...args,
        roomId: roomReq.roomId,
        tariff: roomReq.tariff,
        extraBed: roomReq.extraBed || false,
        plan: roomReq.plan || "EP",
        advance: roomAdvance,
        totalAmount: roomTotal,
      }, groupBookingId);

      bookingIds.push(bid);
    }

    return groupBookingId;
  },
});

export const checkIn = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");
    
    const groupBookingId = booking.groupBookingId;
    let bookingsToUpdate = [booking];
    
    if (groupBookingId) {
      bookingsToUpdate = await ctx.db
        .query("bookings")
        .withIndex("by_groupBookingId", (q) => q.eq("groupBookingId", groupBookingId))
        .collect();
    }
    
    for (const bk of bookingsToUpdate) {
      if (bk.status !== "checked_in") {
        await ctx.db.patch(bk._id, { status: "checked_in" });
        await ctx.db.patch(bk.roomId, { status: "occupied" });
      }
    }
    
    return { success: true };
  },
});

export const checkOut = mutation({
  args: { bookingId: v.id("bookings"), paymentMethod: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");
    
    const groupBookingId = booking.groupBookingId;
    let bookingsToUpdate = [booking];
    
    if (groupBookingId) {
      bookingsToUpdate = await ctx.db
        .query("bookings")
        .withIndex("by_groupBookingId", (q) => q.eq("groupBookingId", groupBookingId))
        .collect();
    }
    
    for (const bk of bookingsToUpdate) {
      if (bk.status !== "checked_out") {
        await ctx.db.patch(bk._id, { status: "checked_out" });
        await ctx.db.patch(bk.roomId, { status: "dirty" });
      }
    }
    
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

export const updateBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
    guestName: v.optional(v.string()),
    guestPhone: v.optional(v.string()),
    checkIn: v.optional(v.string()),
    checkOut: v.optional(v.string()),
    tariff: v.optional(v.number()),
    advance: v.optional(v.number()),
    totalAmount: v.optional(v.number()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { bookingId, ...updates } = args;
    const old = await ctx.db.get(bookingId);
    if (!old) throw new Error("Booking not found");

    if (updates.totalAmount !== undefined && old.guestId) {
      const guest = await ctx.db.get(old.guestId);
      if (guest) {
        await ctx.db.patch(old.guestId, {
          totalSpend: Math.max(0, guest.totalSpend - old.totalAmount + updates.totalAmount),
        });
      }
    }

    const newTotal = updates.totalAmount ?? old.totalAmount;
    const newAdvance = updates.advance ?? old.advance;
    const balance = newTotal - newAdvance;

    return await ctx.db.patch(bookingId, { ...updates, balance });
  },
});

export const deleteBooking = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const old = await ctx.db.get(args.bookingId);
    if (!old) throw new Error("Booking not found");

    if (old.guestId) {
      const guest = await ctx.db.get(old.guestId);
      if (guest) {
        await ctx.db.patch(old.guestId, {
          totalSpend: Math.max(0, guest.totalSpend - old.totalAmount),
          totalVisits: Math.max(0, guest.totalVisits - 1),
        });
      }
    }
    await ctx.db.delete(args.bookingId);
  },
});