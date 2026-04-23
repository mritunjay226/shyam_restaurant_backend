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
    advancePercentage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("hotelSettings").first();

    if (!existing) {
      // If it doesn't exist during update, create it with defaults
      return await ctx.db.insert("hotelSettings", {
        hotelName: args.hotelName || "Sarovar Palace",
        address: args.address || "Sarovar Palace, Lukerganj, Prayagraj",
        phone: args.phone || "+91 91234 56789",
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

// SYNC BRANDING (one-off fix)
export const syncBranding = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("hotelSettings").first();
    const branding = {
      hotelName: "Sarovar Palace",
      address: "Sarovar Palace, Lukerganj, Prayagraj",
      phone: "+91 91234 56789",
      email: "contact@sarovarpalace.com",
      gstin: "09AABCU9603R1ZN",
    };

    if (existing) {
      await ctx.db.patch(existing._id, branding);
      return "Updated existing settings to Sarovar Palace";
    } else {
      await ctx.db.insert("hotelSettings", {
        ...branding,
        checkInTime: "12:00 PM",
        checkOutTime: "11:00 AM",
        roomGst: 12,
        foodGst: 5,
        alGst: 18,
      });
      return "Created new settings with Sarovar Palace branding";
    }
  },
});