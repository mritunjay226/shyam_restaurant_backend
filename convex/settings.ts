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
    roomGst: v.optional(v.number()),
    foodGst: v.optional(v.number()),
    alGst: v.optional(v.number()),
    autoCheckoutReminders: v.optional(v.boolean()),
    requireIdUpload: v.optional(v.boolean()),
    defaultKitchenTab: v.optional(v.string()),
    defaultBillingTab: v.optional(v.string()),
    staffTypes: v.optional(v.array(v.string())),
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
    roomGst: v.optional(v.number()),
    foodGst: v.optional(v.number()),
    alGst: v.optional(v.number()),
    autoCheckoutReminders: v.optional(v.boolean()),
    requireIdUpload: v.optional(v.boolean()),
    defaultKitchenTab: v.optional(v.string()),
    defaultBillingTab: v.optional(v.string()),
    staffTypes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("hotelSettings").first();
    
    if (!existing) {
      // If it doesn't exist during update, create it with defaults
      return await ctx.db.insert("hotelSettings", {
        hotelName: args.hotelName || "The Grand Hotel",
        address: args.address || "123 default avenue",
        phone: args.phone || "+91 00000 00000",
        gstin: args.gstin || "N/A",
        checkInTime: args.checkInTime || "12:00 PM",
        checkOutTime: args.checkOutTime || "11:00 AM",
        email: args.email,
        roomGst: args.roomGst,
        foodGst: args.foodGst,
        alGst: args.alGst,
        autoCheckoutReminders: args.autoCheckoutReminders,
        requireIdUpload: args.requireIdUpload,
      });
    }

    return await ctx.db.patch(existing._id, args);
  },
});