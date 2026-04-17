import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────
// FOLIO NUMBER HELPER
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
    // Get room details for error reporting
    const roomRecord = await ctx.db.get(args.roomId);
    const roomLabel = roomRecord ? `Room ${roomRecord.roomNumber}` : "This room";

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
          `${roomLabel} is already booked from ${b.checkIn} to ${b.checkOut} (${b.guestName}). Please choose different dates.`
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
    return ctx.db.insert("bookings", {
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
    });
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