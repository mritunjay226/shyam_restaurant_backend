import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// GET ALL MENU ITEMS
export const getAllMenuItems = query({
  handler: async (ctx) => {
    return await ctx.db.query("menuItems").collect();
  },
});

// GET MENU BY OUTLET
export const getMenuByOutlet = query({
  args: { outlet: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("menuItems")
      .filter((q) => q.eq(q.field("outlet"), args.outlet))
      .collect();
  },
});

// ADD MENU ITEM (admin)
export const addMenuItem = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    subCategory: v.string(),
    price: v.number(),
    outlet: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("menuItems", {
      ...args,
      isAvailable: true,
    });
  },
});

// UPDATE MENU ITEM PRICE (admin)
export const updateMenuItemPrice = mutation({
  args: {
    menuItemId: v.id("menuItems"),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.menuItemId, { price: args.price });
  },
});

// TOGGLE MENU ITEM AVAILABILITY (admin)
export const toggleMenuItemAvailability = mutation({
  args: { menuItemId: v.id("menuItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.menuItemId);
    if (!item) throw new Error("Menu item not found");
    return await ctx.db.patch(args.menuItemId, {
      isAvailable: !item.isAvailable,
    });
  },
});

// UPDATE MENU ITEM (admin)
export const updateMenuItem = mutation({
  args: {
    menuItemId: v.id("menuItems"),
    name: v.optional(v.string()),
    price: v.optional(v.number()),
    category: v.optional(v.string()),
    subCategory: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { menuItemId, ...updates } = args;
    return await ctx.db.patch(menuItemId, updates);
  },
});

// DELETE MENU ITEM (admin)
export const deleteMenuItem = mutation({
  args: { menuItemId: v.id("menuItems") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.menuItemId);
  },
});