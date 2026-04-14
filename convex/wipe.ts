import { mutation } from "./_generated/server";

export const clearData = mutation({
  handler: async (ctx) => {
    // Delete all categories
    const categories = await ctx.db.query("categories").collect();
    for (const cat of categories) {
      await ctx.db.delete(cat._id);
    }

    // Delete all banquet menu items
    const menuItems = await ctx.db.query("banquetMenuItems").collect();
    for (const item of menuItems) {
      await ctx.db.delete(item._id);
    }

    return `Deleted ${categories.length} categories and ${menuItems.length} menu items.`;
  },
});
