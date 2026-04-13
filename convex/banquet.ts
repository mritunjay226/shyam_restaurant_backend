import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Time-slot rules:
//   "morning"  = 06:00–14:00
//   "evening"  = 14:00–23:00
//   "full_day" = whole day (blocks morning + evening)
//
// Two bookings conflict if they are on the same hall + same date AND
// their time slots overlap:
//   full_day  conflicts with anything
//   morning   conflicts with morning or full_day
//   evening   conflicts with evening or full_day

function slotsConflict(a: string | undefined, b: string | undefined): boolean {
  const s1 = a || "full_day";
  const s2 = b || "full_day";
  if (s1 === "full_day" || s2 === "full_day") return true;
  return s1 === s2; // morning vs morning | evening vs evening
}

// ─────────────────────────────────────────────────────────────────
// HALL QUERIES
// ─────────────────────────────────────────────────────────────────

export const getAllHalls = query({
  handler: async (ctx) => ctx.db.query("banquetHalls").collect(),
});

export const getHallById = query({
  args: { hallId: v.id("banquetHalls") },
  handler: async (ctx, args) => ctx.db.get(args.hallId),
});

// ─────────────────────────────────────────────────────────────────
// HALL MUTATIONS
// ─────────────────────────────────────────────────────────────────

export const addHall = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    capacity: v.number(),
    price: v.number(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    ctx.db.insert("banquetHalls", { ...args, isActive: true }),
});

export const toggleHallActive = mutation({
  args: { hallId: v.id("banquetHalls") },
  handler: async (ctx, args) => {
    const hall = await ctx.db.get(args.hallId);
    if (!hall) throw new Error("Hall not found");
    return ctx.db.patch(args.hallId, { isActive: !hall.isActive });
  },
});

export const updateHall = mutation({
  args: {
    hallId: v.id("banquetHalls"),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    capacity: v.optional(v.number()),
    price: v.optional(v.number()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { hallId, ...updates } = args;
    return ctx.db.patch(hallId, updates);
  },
});

// ─────────────────────────────────────────────────────────────────
// BOOKING QUERIES
// ─────────────────────────────────────────────────────────────────

export const getAllBanquetBookings = query({
  handler: async (ctx) => ctx.db.query("banquetBookings").collect(),
});

export const getBookingsByHall = query({
  args: { hallId: v.id("banquetHalls") },
  handler: async (ctx, args) =>
    ctx.db
      .query("banquetBookings")
      .filter((q) => q.eq(q.field("hallId"), args.hallId))
      .collect(),
});

export const getBookingsByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("banquetBookings")
      .filter((q) => q.eq(q.field("eventDate"), args.date))
      .collect(),
});

// ─────────────────────────────────────────────────────────────────
// BOOKING MUTATIONS
// ─────────────────────────────────────────────────────────────────

export const createBanquetBooking = mutation({
  args: {
    hallId: v.id("banquetHalls"),
    eventName: v.string(),
    eventType: v.string(),
    eventDate: v.string(),
    timeSlot: v.optional(v.string()),     // "morning" | "evening" | "full_day"
    guestName: v.string(),
    guestPhone: v.string(),
    guestCount: v.number(),
    plateCost: v.optional(v.number()),
    menuPackage: v.optional(v.string()),
    totalAmount: v.number(),
    advance: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slot = args.timeSlot || "full_day";

    // ── Time-slot aware conflict check ──────────────────────────
    const sameDayBookings = await ctx.db
      .query("banquetBookings")
      .filter((q) =>
        q.and(
          q.eq(q.field("hallId"), args.hallId),
          q.eq(q.field("eventDate"), args.eventDate),
          q.neq(q.field("status"), "cancelled")
        )
      )
      .collect();

    for (const b of sameDayBookings) {
      if (slotsConflict(slot, b.timeSlot)) {
        const existSlot = b.timeSlot || "full_day";
        throw new Error(
          `Hall already booked on ${args.eventDate} (${existSlot} slot) for "${b.eventName}". ` +
          `Try the ${existSlot === "morning" ? "evening" : "morning"} slot or a different date.`
        );
      }
    }

    // ── 2. GUEST PROFILE (upsert) ──────────────────────────────────
    const existingGuest = await ctx.db
      .query("guests")
      .withIndex("by_phone", (q) => q.eq("phone", args.guestPhone))
      .first();

    if (existingGuest) {
      await ctx.db.patch(existingGuest._id, {
        totalVisits: existingGuest.totalVisits + 1,
        totalSpend: existingGuest.totalSpend + args.totalAmount,
      });
    } else {
      await ctx.db.insert("guests", {
        name: args.guestName,
        phone: args.guestPhone,
        totalVisits: 1,
        totalSpend: args.totalAmount,
      });
    }

    return ctx.db.insert("banquetBookings", {
      hallId: args.hallId,
      eventName: args.eventName,
      eventType: args.eventType,
      eventDate: args.eventDate,
      timeSlot: slot,
      guestName: args.guestName,
      guestPhone: args.guestPhone,
      guestCount: args.guestCount,
      plateCost: args.plateCost,
      menuPackage: args.menuPackage,
      totalAmount: args.totalAmount,
      advance: args.advance,
      balance: args.totalAmount - args.advance,
      status: "confirmed",
      notes: args.notes,
    });

  },
});

export const updateBanquetBooking = mutation({
  args: {
    bookingId: v.id("banquetBookings"),
    eventName: v.optional(v.string()),
    eventType: v.optional(v.string()),
    eventDate: v.optional(v.string()),
    timeSlot: v.optional(v.string()),
    guestName: v.optional(v.string()),
    guestPhone: v.optional(v.string()),
    guestCount: v.optional(v.number()),
    plateCost: v.optional(v.number()),
    menuPackage: v.optional(v.string()),
    totalAmount: v.optional(v.number()),
    advance: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { bookingId, ...updates } = args;
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Booking not found");

    const totalAmount = updates.totalAmount ?? booking.totalAmount;
    const advance = updates.advance ?? booking.advance;

    return ctx.db.patch(bookingId, { ...updates, balance: totalAmount - advance });
  },
});

export const cancelBanquetBooking = mutation({
  args: { bookingId: v.id("banquetBookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");
    return ctx.db.patch(args.bookingId, { status: "cancelled" });
  },
});

export const completeBanquetBooking = mutation({
  args: { bookingId: v.id("banquetBookings") },
  handler: async (ctx, args) =>
    ctx.db.patch(args.bookingId, { status: "completed" }),
});