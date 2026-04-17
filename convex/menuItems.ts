import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// GET ALL MENU ITEMS
export const getAllMenuItems = query({
  args: { includeInactive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const categories = await ctx.db.query("categories").collect();
    const categoryIdMap = new Map(categories.map(c => [c._id, c.name]));
    let items = await ctx.db.query("banquetMenuItems").collect();
    
    if (!args.includeInactive) {
      items = items.filter(i => i.isAvailable !== false);
    }
    
    return items.map(item => ({
      ...item,
      category: categoryIdMap.get(item.categoryId) || "Other"
    }));
  },
});

// GET MENU BY OUTLET
export const getMenuByOutlet = query({
  args: { outlet: v.string() },
  handler: async (ctx, args) => {
    // 1. Define category mappings for each outlet
    const CAFE_CATEGORIES = [
      "Breakfast", "Mocktail", "Coffee", "Cold Brews", "Teas", "Maggi", 
      "Burgers / Sandwiches", "Mithai & Meetha", "Ice Cream & Sundaes"
    ];
    
    const RESTAURANT_CATEGORIES = [
      "Other Starters", "Pasta", "Pizzeria", "Garlic Bread", 
      "Noodles", "Rice", "Chinese Main Course", "Sides", "Soup Bowls", 
      "Tandoori Snacks", "Indian Main Course", "Indian Breads", "Salads & Raita"
    ];

    const targetCategories = args.outlet.toLowerCase() === 'cafe' 
      ? CAFE_CATEGORIES 
      : RESTAURANT_CATEGORIES;

    // 2. Fetch all categories
    const categories = await ctx.db.query("categories").collect();
    const categoryIdMap = new Map(categories.map(c => [c._id, c.name]));
    
    // 3. Fetch banquet menu items
    const items = await ctx.db.query("banquetMenuItems").collect();

    // 4. Map and filter items to match the old menuItems structure
    return items
      .map(item => ({
        ...item,
        category: categoryIdMap.get(item.categoryId) || "Other",
      }))
      .filter(item => targetCategories.includes(item.category) && item.isAvailable !== false);
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
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Resolve category name to ID
    const category = await ctx.db
      .query("categories")
      .filter((q) => q.eq(q.field("name"), args.category))
      .first();

    if (!category) throw new Error("Category not found");

    return await ctx.db.insert("banquetMenuItems", {
      name: args.name,
      categoryId: category._id,
      price: args.price,
      description: args.description,
      image: args.image,
      isAvailable: true,
      dietaryType: "veg", // Defaulting for compatibility
    });
  },
});

// UPDATE MENU ITEM PRICE (admin)
export const updateMenuItemPrice = mutation({
  args: {
    menuItemId: v.id("banquetMenuItems"),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.menuItemId, { price: args.price });
  },
});

// TOGGLE MENU ITEM AVAILABILITY (admin)
export const toggleMenuItemAvailability = mutation({
  args: { menuItemId: v.id("banquetMenuItems") },
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
    menuItemId: v.id("banquetMenuItems"),
    name: v.optional(v.string()),
    price: v.optional(v.number()),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { menuItemId, category, ...updates } = args;
    
    let categoryId;
    if (category) {
      const cat = await ctx.db
        .query("categories")
        .filter((q) => q.eq(q.field("name"), category))
        .first();
      if (cat) categoryId = cat._id;
    }

    return await ctx.db.patch(menuItemId, {
      ...updates,
      ...(categoryId ? { categoryId } : {}),
    });
  },
});

// DELETE MENU ITEM (admin)
export const deleteMenuItem = mutation({
  args: { menuItemId: v.id("banquetMenuItems") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.menuItemId);
  },
});