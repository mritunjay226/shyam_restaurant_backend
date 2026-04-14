import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ==========================================
// QUERIES (Reading Data)
// ==========================================

// 1. Get all categories
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();
    // Sort them in memory by sortOrder if it exists
    return categories.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },
});

// 2. Get all menu items (Optionally filtered by a specific category)
export const getMenuItems = query({
  args: {
    categoryId: v.optional(v.id("categories")),
  },
  handler: async (ctx, args) => {
    if (args.categoryId) {
      // Use the index for fast, targeted lookups
      return await ctx.db
        .query("banquetMenuItems")
        .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId!))
        .collect();
    }
    // If no categoryId is provided, return the whole menu
    return await ctx.db.query("banquetMenuItems").collect();
  },
});

// 3. Get menu items by dietary type (e.g., fetch all "veg" items)
export const getItemsByDietaryType = query({
  args: {
    dietaryType: v.union(v.literal("veg"), v.literal("non-veg"), v.literal("egg")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("banquetMenuItems")
      .withIndex("by_dietary", (q) => q.eq("dietaryType", args.dietaryType))
      .collect();
  },
});


// ==========================================
// MUTATIONS (Writing/Modifying Data)
// ==========================================

// 4. Create a new category
export const createCategory = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("categories", args);
  },
});

// 5. Create a new menu item
export const createMenuItem = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    unit: v.optional(v.string()),
    dietaryType: v.optional(
      v.union(v.literal("veg"), v.literal("non-veg"), v.literal("egg"))
    ),
    availabilityWindow: v.optional(v.string()),
    isAvailable: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("banquetMenuItems", args);
  },
});

// 6. Update an existing menu item (Full update)
export const updateMenuItem = mutation({
  args: {
    id: v.id("banquetMenuItems"),
    categoryId: v.optional(v.id("categories")),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    unit: v.optional(v.string()),
    dietaryType: v.optional(
      v.union(v.literal("veg"), v.literal("non-veg"), v.literal("egg"))
    ),
    availabilityWindow: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

// 7. Quick Toggle: Mark an item as available or out of stock
export const toggleAvailability = mutation({
  args: {
    id: v.id("banquetMenuItems"),
    isAvailable: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isAvailable: args.isAvailable });
  },
});

// 8. Delete a menu item entirely
export const deleteMenuItem = mutation({
  args: { id: v.id("banquetMenuItems") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// 9. Delete a category
export const deleteCategory = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});