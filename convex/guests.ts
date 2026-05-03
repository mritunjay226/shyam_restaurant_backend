import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** List all unique guest profiles */
export const list = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("guests")
      .order("desc")
      .collect();
  },
});

/** Get detailed guest profile by ID */
export const getById = query({
  args: { guestId: v.id("guests") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.guestId);
  },
});

/** Get guest history (bookings, banquet bookings, and bills) */
export const getHistory = query({
  args: { phone: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    // 1. Room Bookings
    const roomBookings = await ctx.db
      .query("bookings")
      .withIndex("by_guestPhone", (q) => q.eq("guestPhone", args.phone))
      .collect();

    // 2. Banquet Bookings
    const banquetBookings = await ctx.db
      .query("banquetBookings")
      .withIndex("by_guestPhone", (q) => q.eq("guestPhone", args.phone))
      .collect();

    // 3. Bills (all bills for this guest name)
    const bills = await ctx.db
      .query("bills")
      .withIndex("by_guestName", (q) => q.eq("guestName", args.name))
      .collect();

    return {
      roomBookings: roomBookings.sort((a,b) => b._creationTime - a._creationTime),
      banquetBookings: banquetBookings.sort((a,b) => b._creationTime - a._creationTime),
      bills: bills.sort((a,b) => b._creationTime - a._creationTime),
    };
  },
});

export const updateGuest = mutation({
  args: {
    guestId: v.id("guests"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    idType: v.optional(v.string()),
    idNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { guestId, ...updates } = args;
    return await ctx.db.patch(guestId, updates);
  },
});

export const deleteGuest = mutation({
  args: { guestId: v.id("guests") },
  handler: async (ctx, args) => {
    const guest = await ctx.db.get(args.guestId);
    if (!guest) throw new Error("Guest not found");

    const { name, phone } = guest;

    // 1. Delete Room Bookings
    const roomBookings = await ctx.db
      .query("bookings")
      .withIndex("by_guestPhone", (q) => q.eq("guestPhone", phone))
      .collect();
    for (const b of roomBookings) {
      await ctx.db.delete(b._id);
    }

    // 2. Delete Banquet Bookings
    const banquetBookings = await ctx.db
      .query("banquetBookings")
      .withIndex("by_guestPhone", (q) => q.eq("guestPhone", phone))
      .collect();
    for (const b of banquetBookings) {
      await ctx.db.delete(b._id);
    }

    // 3. Delete Bills
    const bills = await ctx.db
      .query("bills")
      .withIndex("by_guestName", (q) => q.eq("guestName", name))
      .collect();
    for (const b of bills) {
      await ctx.db.delete(b._id);
    }

    // 4. Delete the Guest Profile
    await ctx.db.delete(args.guestId);

    return { success: true };
  },
});
