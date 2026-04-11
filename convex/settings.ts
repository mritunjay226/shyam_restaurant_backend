import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// GET HOTEL SETTINGS
export const getHotelSettings = query({
  handler: async (ctx) => {
    return await ctx.db.query("hotelSettings").first();
  },
});

// CREATE HOTEL SETTINGS (run once on setup)
export const createHotelSettings = mutation({
  args: {
    hotelName: v.string(),
    address: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    gstin: v.string(),
    checkInTime: v.string(),
    checkOutTime: v.string(),
  },
  handler: async (ctx, args) => {
    // check if settings already exist
    const existing = await ctx.db.query("hotelSettings").first();
    if (existing) throw new Error("Settings already exist, use update instead");

    return await ctx.db.insert("hotelSettings", args);
  },
});

// UPDATE HOTEL SETTINGS
export const updateHotelSettings = mutation({
  args: {
    hotelName: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    gstin: v.optional(v.string()),
    checkInTime: v.optional(v.string()),
    checkOutTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("hotelSettings").first();
    if (!existing) throw new Error("Settings not found, create first");

    return await ctx.db.patch(existing._id, args);
  },
});