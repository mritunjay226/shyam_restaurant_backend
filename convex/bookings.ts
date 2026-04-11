import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// GET ALL BOOKINGS
export const getAllBookings = query({
  handler: async (ctx) => {
    return await ctx.db.query("bookings").collect();
  },
});

// GET BOOKINGS BY ROOM
export const getBookingsByRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .collect();
  },
});

// GET TODAY'S ARRIVALS
export const getTodayArrivals = query({
  args: { today: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookings")
      .filter((q) =>
        q.and(
          q.eq(q.field("checkIn"), args.today),
          q.eq(q.field("status"), "confirmed")
        )
      )
      .collect();
  },
});

// GET TODAY'S DEPARTURES
export const getTodayDepartures = query({
  args: { today: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookings")
      .filter((q) =>
        q.and(
          q.eq(q.field("checkOut"), args.today),
          q.eq(q.field("status"), "checked_in")
        )
      )
      .collect();
  },
});

// CREATE BOOKING
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
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // update room status to occupied
    await ctx.db.patch(args.roomId, { status: "occupied" });

    return await ctx.db.insert("bookings", {
      ...args,
      balance: args.totalAmount - args.advance,
      status: "confirmed",
    });
  },
});

// CHECK IN
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

// CHECK OUT
export const checkOut = mutation({
  args: {
    bookingId: v.id("bookings"),
    paymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    await ctx.db.patch(args.bookingId, { status: "checked_out" });
    await ctx.db.patch(booking.roomId, { status: "available" });

    return { success: true };
  },
});

// CANCEL BOOKING
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

// UPDATE ADVANCE PAYMENT
export const updateAdvance = mutation({
  args: {
    bookingId: v.id("bookings"),
    advance: v.number(),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    return await ctx.db.patch(args.bookingId, {
      advance: args.advance,
      balance: booking.totalAmount - args.advance,
    });
  },
});