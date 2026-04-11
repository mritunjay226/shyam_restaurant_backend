import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// GET ALL BANQUET HALLS
export const getAllHalls = query({
  handler: async (ctx) => {
    return await ctx.db.query("banquetHalls").collect();
  },
});

// GET SINGLE HALL
export const getHallById = query({
  args: { hallId: v.id("banquetHalls") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.hallId);
  },
});

// ADD HALL (admin)
export const addHall = mutation({
  args: {
    name: v.string(),
    capacity: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("banquetHalls", {
      ...args,
      isActive: true,
    });
  },
});

// TOGGLE HALL ACTIVE/INACTIVE (admin)
export const toggleHallActive = mutation({
  args: { hallId: v.id("banquetHalls") },
  handler: async (ctx, args) => {
    const hall = await ctx.db.get(args.hallId);
    if (!hall) throw new Error("Hall not found");
    return await ctx.db.patch(args.hallId, {
      isActive: !hall.isActive,
    });
  },
});

// UPDATE HALL (admin)
export const updateHall = mutation({
  args: {
    hallId: v.id("banquetHalls"),
    name: v.optional(v.string()),
    capacity: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { hallId, ...updates } = args;
    return await ctx.db.patch(hallId, updates);
  },
});

// GET ALL BANQUET BOOKINGS
export const getAllBanquetBookings = query({
  handler: async (ctx) => {
    return await ctx.db.query("banquetBookings").collect();
  },
});

// GET BOOKINGS BY HALL
export const getBookingsByHall = query({
  args: { hallId: v.id("banquetHalls") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("banquetBookings")
      .filter((q) => q.eq(q.field("hallId"), args.hallId))
      .collect();
  },
});

// GET BOOKINGS BY DATE
export const getBookingsByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("banquetBookings")
      .filter((q) => q.eq(q.field("eventDate"), args.date))
      .collect();
  },
});

// CREATE BANQUET BOOKING
export const createBanquetBooking = mutation({
  args: {
    hallId: v.id("banquetHalls"),
    eventName: v.string(),
    eventType: v.string(),
    eventDate: v.string(),
    guestName: v.string(),
    guestPhone: v.string(),
    guestCount: v.number(),
    menuPackage: v.optional(v.string()),
    totalAmount: v.number(),
    advance: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // check if hall is already booked on that date
    const existing = await ctx.db
      .query("banquetBookings")
      .filter((q) =>
        q.and(
          q.eq(q.field("hallId"), args.hallId),
          q.eq(q.field("eventDate"), args.eventDate),
          q.neq(q.field("status"), "cancelled")
        )
      )
      .first();

    if (existing) throw new Error("Hall already booked on this date");

    return await ctx.db.insert("banquetBookings", {
      ...args,
      balance: args.totalAmount - args.advance,
      status: "confirmed",
    });
  },
});

// UPDATE BANQUET BOOKING
export const updateBanquetBooking = mutation({
  args: {
    bookingId: v.id("banquetBookings"),
    eventName: v.optional(v.string()),
    eventType: v.optional(v.string()),
    eventDate: v.optional(v.string()),
    guestName: v.optional(v.string()),
    guestPhone: v.optional(v.string()),
    guestCount: v.optional(v.number()),
    menuPackage: v.optional(v.string()),
    totalAmount: v.optional(v.number()),
    advance: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { bookingId, ...updates } = args;
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Booking not found");

    // recalculate balance if amount or advance changed
    const totalAmount = updates.totalAmount ?? booking.totalAmount;
    const advance = updates.advance ?? booking.advance;

    return await ctx.db.patch(bookingId, {
      ...updates,
      balance: totalAmount - advance,
    });
  },
});

// CANCEL BANQUET BOOKING
export const cancelBanquetBooking = mutation({
  args: { bookingId: v.id("banquetBookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");
    return await ctx.db.patch(args.bookingId, { status: "cancelled" });
  },
});

// COMPLETE BANQUET BOOKING
export const completeBanquetBooking = mutation({
  args: { bookingId: v.id("banquetBookings") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.bookingId, { status: "completed" });
  },
});