import { query } from "./_generated/server";
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
      .filter((q) => q.eq(q.field("guestPhone"), args.phone))
      .collect();

    // 2. Banquet Bookings
    const banquetBookings = await ctx.db
      .query("banquetBookings")
      .filter((q) => q.eq(q.field("guestPhone"), args.phone))
      .collect();

    // 3. Bills (all bills for this guest name)
    // Note: Guest name matching might be fuzzy, but for now we use exact or phone if bills had phone
    // Currently bills only have guestName.
    const bills = await ctx.db
      .query("bills")
      .filter((q) => q.eq(q.field("guestName"), args.name))
      .collect();

    return {
      roomBookings: roomBookings.sort((a,b) => b._creationTime - a._creationTime),
      banquetBookings: banquetBookings.sort((a,b) => b._creationTime - a._creationTime),
      bills: bills.sort((a,b) => b._creationTime - a._creationTime),
    };
  },
});
